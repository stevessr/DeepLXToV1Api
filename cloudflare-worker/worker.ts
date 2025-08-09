/**
 * DeepLX to OpenAI API - Cloudflare Worker TypeScript版本
 */

// 类型定义
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string }>;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface TranslationPayload {
  text: string;
  target_lang: string;
  source_lang?: string;
}

interface TranslationResponse {
  code: number;
  data: string;
  message?: string;
}

interface ChatChoice {
  index: number;
  message?: {
    role: string;
    content: string;
  };
  delta?: {
    content?: string;
  };
  finish_reason: string | null;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface Environment {
  TRANSLATION_API_KEY?: string;
  TRANSLATION_API_URL?: string;
}

// 工具函数
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function parseModel(model: string): { sourceLang: string; targetLang: string } {
  const modelParts = model.split('-');
  let sourceLang = 'auto';
  let targetLang = '';

  if (modelParts.length === 2) {
    targetLang = modelParts[1];
  } else if (modelParts.length === 3) {
    sourceLang = modelParts[1];
    targetLang = modelParts[2];
  } else {
    throw new Error('Invalid model format. Use "deepl-TARGET" for auto-detection or "deepl-SOURCE-TARGET".');
  }

  return { sourceLang, targetLang };
}

function extractTextToTranslate(messages: ChatMessage[]): string {
  for (const message of messages) {
    if (message.role === 'user') {
      const content = message.content || '';
      
      let actualTextContent = '';
      if (typeof content === 'string') {
        actualTextContent = content;
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part === 'object' && part.type === 'text' && part.text) {
            actualTextContent = part.text;
            break;
          }
        }
      }
      
      if (actualTextContent) {
        try {
          const startMarker = 'Source Text: ';
          const endMarker = '\n\nTranslated Text:';
          const startIndex = actualTextContent.indexOf(startMarker);
          const endIndex = actualTextContent.indexOf(endMarker, startIndex + startMarker.length);
          
          if (startIndex !== -1 && endIndex !== -1) {
            return actualTextContent.substring(startIndex + startMarker.length, endIndex).trim();
          }
        } catch (e) {
          // 如果解析失败，使用整个内容
        }
        return actualTextContent.trim();
      }
      break;
    }
  }
  return '';
}

async function translateText(
  text: string, 
  sourceLang: string, 
  targetLang: string, 
  env: Environment
): Promise<string> {
  if (!text.trim() || sourceLang === targetLang) {
    return text;
  }

  const apiKey = env.TRANSLATION_API_KEY || '';
  const apiUrl = env.TRANSLATION_API_URL || 
                 (apiKey ? `https://api.deeplx.org/${apiKey}/translate` : 'https://api.deeplx.org/translate');

  const payload: TranslationPayload = {
    text: text,
    target_lang: targetLang
  };
  
  if (sourceLang && sourceLang !== 'auto') {
    payload.source_lang = sourceLang;
  }

  const startTime = Date.now();
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`Translation from '${sourceLang || 'auto'}' to '${targetLang}' took: ${elapsed.toFixed(2)}s`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Translation failed with status ${response.status}: ${errorText}`);
      throw new Error(`Translation service returned status ${response.status}`);
    }

    const result: TranslationResponse = await response.json();
    if (result.code !== 200) {
      console.error('Translation API error:', result);
      throw new Error(`Translation API error: ${result.message || 'Unknown error'}`);
    }

    return result.data || '';
  } catch (error) {
    console.error('Error during translation:', error);
    throw new Error(`Error connecting to translation service: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function createStreamResponse(translatedText: string, model: string): Response {
  const chatId = 'chatcmpl-' + generateUUID();
  const createdTime = Math.floor(Date.now() / 1000);

  const chunkData: ChatCompletionResponse = {
    id: chatId,
    object: 'chat.completion.chunk',
    created: createdTime,
    model: model,
    choices: [{
      index: 0,
      delta: { content: translatedText },
      finish_reason: null
    }]
  };

  const finalChunk: ChatCompletionResponse = {
    id: chatId,
    object: 'chat.completion.chunk',
    created: createdTime,
    model: model,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: 'stop'
    }]
  };

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(`data: ${JSON.stringify(chunkData)}\n\n`);
      controller.enqueue(`data: ${JSON.stringify(finalChunk)}\n\n`);
      controller.enqueue('data: [DONE]\n\n');
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

function createJsonResponse(translatedText: string, model: string): Response {
  const responseData: ChatCompletionResponse = {
    id: 'chatcmpl-' + generateUUID(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: translatedText
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };

  return new Response(JSON.stringify(responseData), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

function handleOptions(): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// 主处理函数
export default {
  async fetch(request: Request, env: Environment, ctx: ExecutionContext): Promise<Response> {
    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // 只处理POST请求到/v1/chat/completions
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/v1/chat/completions') {
      return new Response('Not found', { status: 404 });
    }

    try {
      const chatRequest: ChatRequest = await request.json();
      console.log(`Received request for model: ${chatRequest.model}`);

      // 解析模型名称
      const { sourceLang, targetLang } = parseModel(chatRequest.model);

      // 提取要翻译的文本
      const textToTranslate = extractTextToTranslate(chatRequest.messages || []);
      
      if (!textToTranslate) {
        return new Response(JSON.stringify({ error: 'No text to translate found in user message.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log(`Translating text: '${textToTranslate.substring(0, 100)}...'`);

      // 执行翻译
      const translatedText = await translateText(textToTranslate, sourceLang, targetLang, env);

      // 根据是否需要流式响应返回不同格式
      if (chatRequest.stream) {
        return createStreamResponse(translatedText, chatRequest.model);
      } else {
        return createJsonResponse(translatedText, chatRequest.model);
      }

    } catch (error) {
      console.error('Error processing request:', error);
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
