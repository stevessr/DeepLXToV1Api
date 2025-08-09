import logging
import uuid
import time
import json
import aiohttp
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from models.schemas import ChatRequest
from core.translation import translate_single
from core.security import security_middleware, get_cors_headers

router = APIRouter()

@router.options("/v1/chat/completions")
async def handle_options(request: Request):
    """处理CORS预检请求"""
    cors_headers = get_cors_headers(request)
    return JSONResponse(content={}, headers=cors_headers)

@router.post("/v1/chat/completions")
async def translate_request(chat_request: ChatRequest, request: Request):
    # 安全验证
    security_middleware(request)

    logging.info(f"Received request for model: {chat_request.model}")

    model_parts = chat_request.model.split('-')
    source_lang = "auto"
    target_lang = ""

    if len(model_parts) == 2:  # e.g., "deepl-ZH"
        target_lang = model_parts[1]
    elif len(model_parts) == 3:  # e.g., "deepl-EN-ZH"
        source_lang = model_parts[1]
        target_lang = model_parts[2]
    else:
        msg = "Invalid model format. Use 'deepl-TARGET' for auto-detection or 'deepl-SOURCE-TARGET'."
        logging.error(msg)
        cors_headers = get_cors_headers(request)
        return JSONResponse(
            status_code=400,
            content={"error": msg},
            headers=cors_headers
        )

    text_to_translate = ""
    for message in chat_request.messages:
        if message.get('role') == 'user':
            content = message.get('content', "")
            
            actual_text_content = ""
            if isinstance(content, str):
                actual_text_content = content
            elif isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and part.get('type') == 'text':
                        actual_text_content = part.get('text', '')
                        break
            
            if actual_text_content:
                try:
                    start_marker = "Source Text: "
                    end_marker = "\n\nTranslated Text:"
                    start_index = actual_text_content.index(start_marker) + len(start_marker)
                    end_index = actual_text_content.index(end_marker, start_index)
                    text_to_translate = actual_text_content[start_index:end_index].strip()
                except ValueError:
                    text_to_translate = actual_text_content.strip()
            
            break

    if not text_to_translate:
        msg = "No text to translate found in user message."
        logging.warning(msg)
        cors_headers = get_cors_headers(request)
        return JSONResponse(
            status_code=400,
            content={"error": msg},
            headers=cors_headers
        )

    logging.info(f"Translating text: '{text_to_translate[:100]}...'")

    async def perform_translation() -> str:
        async with aiohttp.ClientSession() as session:
            return await translate_single(text_to_translate, source_lang, target_lang, session)

    if chat_request.stream:
        async def sse_translate():
            chat_id = "chatcmpl-" + str(uuid.uuid4())
            created_time = int(time.time())
            
            try:
                translated_text = await perform_translation()
                
                chunk_data = { "id": chat_id, "object": "chat.completion.chunk", "created": created_time, "model": chat_request.model, "choices": [{"index": 0, "delta": {"content": translated_text}, "finish_reason": None}]}
                yield f"data: {json.dumps(chunk_data)}\n\n"

                final_chunk = { "id": chat_id, "object": "chat.completion.chunk", "created": created_time, "model": chat_request.model, "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]}
                yield f"data: {json.dumps(final_chunk)}\n\n"
            except HTTPException as e:
                 logging.error(f"Error during streaming translation: {e.detail}")
            finally:
                yield "data: [DONE]\n\n"
        
        cors_headers = get_cors_headers(request)
        return StreamingResponse(
            sse_translate(),
            media_type="text/event-stream",
            headers=cors_headers
        )
    else:
        try:
            translated_text = await perform_translation()

            response_data = {
                "id": "chatcmpl-" + str(uuid.uuid4()),
                "object": "chat.completion",
                "created": int(time.time()),
                "model": chat_request.model,
                "choices": [{"index": 0, "message": {"role": "assistant", "content": translated_text}, "finish_reason": "stop"}],
                "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            }
            cors_headers = get_cors_headers(request)
            return JSONResponse(content=response_data, headers=cors_headers)
        except HTTPException as e:
            cors_headers = get_cors_headers(request)
            return JSONResponse(
                status_code=e.status_code,
                content={"error": e.detail},
                headers=cors_headers
            )
