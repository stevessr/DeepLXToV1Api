import aiohttp
import logging
import time
from fastapi import HTTPException
from config import settings

async def translate_single(text: str, source_lang: str, target_lang: str, session: aiohttp.ClientSession) -> str:
    if not text.strip() or source_lang == target_lang:
        return text

    url = settings.TRANSLATION_API_URL
    
    payload = {
        "text": text,
        "target_lang": target_lang
    }
    if source_lang:
        payload["source_lang"] = source_lang

    start_time = time.time()
    try:
        async with session.post(url, json=payload) as response:
            elapsed = time.time() - start_time
            logging.info(f"Translation from '{source_lang or 'auto'}' to '{target_lang}' took: {elapsed:.2f}s")
            
            if response.status != 200:
                error_text = await response.text()
                logging.error(f"Translation failed with status {response.status}: {error_text}")
                raise HTTPException(status_code=response.status, detail=f"Translation service returned status {response.status}")

            result = await response.json()
            if result.get('code') != 200:
                logging.error(f"Translation API error: {result}")
                raise HTTPException(status_code=400, detail=f"Translation API error: {result.get('message', 'Unknown error')}")

            return result.get('data', '')
    except aiohttp.ClientError as e:
        logging.error(f"HTTP Client error during translation: {e}")
        raise HTTPException(status_code=500, detail=f"Error connecting to translation service: {e}")