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
  API_KEY_PROTECTION?: string;
  ALLOWED_ORIGINS?: string;
}

interface ApiKeyValidation {
  valid: boolean;
  error?: string;
  status?: number;
}

interface OriginValidation {
  valid: boolean;
  error?: string;
  status?: number;
  origin?: string;
}

// 工具函数
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 验证API密钥
function validateApiKey(request: Request, env: Environment): ApiKeyValidation {
  const apiKeyProtection = env.API_KEY_PROTECTION;

  // 如果没有设置保护密钥，则允许所有请求
  if (!apiKeyProtection) {
    return { valid: true };
  }

  // 从多个位置获取API密钥
  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('X-API-Key') || request.headers.get('api-key');
  const bearerToken = authHeader?.replace('Bearer ', '');

  const providedKey = apiKeyHeader || bearerToken;

  if (!providedKey) {
    return {
      valid: false,
      error: 'API key required. Please provide it via Authorization header (Bearer token) or X-API-Key header.',
      status: 401
    };
  }

  if (providedKey !== apiKeyProtection) {
    return {
      valid: false,
      error: 'Invalid API key.',
      status: 403
    };
  }

  return { valid: true };
}

// 检查CORS源
function validateOrigin(request: Request, env: Environment): OriginValidation {
  const allowedOrigins = env.ALLOWED_ORIGINS;

  // 如果没有设置源限制，则允许所有源
  if (!allowedOrigins) {
    return { valid: true, origin: '*' };
  }

  const origin = request.headers.get('Origin');
  const allowedList = allowedOrigins.split(',').map(o => o.trim());

  // 检查是否在允许列表中
  if (origin && allowedList.includes(origin)) {
    return { valid: true, origin: origin };
  }

  // 检查通配符匹配
  for (const allowed of allowedList) {
    if (allowed === '*') {
      return { valid: true, origin: '*' };
    }
    if (allowed.includes('*')) {
      const regex = new RegExp(allowed.replace(/\*/g, '.*'));
      if (origin && regex.test(origin)) {
        return { valid: true, origin: origin };
      }
    }
  }

  return {
    valid: false,
    error: `Origin '${origin}' not allowed.`,
    status: 403,
    origin: 'null'
  };
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

function createStreamResponse(translatedText: string, model: string, request: Request, env: Environment): Response {
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

  const corsHeaders = getCorsHeaders(request, env);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders
    }
  });
}

function createJsonResponse(translatedText: string, model: string, request: Request, env: Environment): Response {
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

  const corsHeaders = getCorsHeaders(request, env);

  return new Response(JSON.stringify(responseData), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

function handleOptions(request: Request, env: Environment): Response {
  const originCheck = validateOrigin(request, env);

  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': originCheck.origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, api-key',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// 创建带CORS的响应头
function getCorsHeaders(request: Request, env: Environment): Record<string, string> {
  const originCheck = validateOrigin(request, env);

  return {
    'Access-Control-Allow-Origin': originCheck.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, api-key'
  };
}

// 创建错误响应
function createErrorResponse(message: string, status: number = 400, request: Request, env: Environment): Response {
  const corsHeaders = getCorsHeaders(request, env);

  return new Response(JSON.stringify({ error: message }), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

// 主处理函数
export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    try {
      // 处理CORS预检请求
      if (request.method === 'OPTIONS') {
        return handleOptions(request, env);
      }

      // 只处理POST请求到/v1/chat/completions
      if (request.method !== 'POST') {
        return createErrorResponse('Method not allowed', 405, request, env);
      }

      const url = new URL(request.url);
      if (url.pathname !== '/v1/chat/completions') {
        return createErrorResponse('Not found', 404, request, env);
      }

      // 验证API密钥
      const keyValidation = validateApiKey(request, env);
      if (!keyValidation.valid) {
        return createErrorResponse(keyValidation.error!, keyValidation.status!, request, env);
      }

      // 验证CORS源
      const originValidation = validateOrigin(request, env);
      if (!originValidation.valid) {
        return createErrorResponse(originValidation.error!, originValidation.status!, request, env);
      }

      const chatRequest: ChatRequest = await request.json();
      console.log(`Received request for model: ${chatRequest.model}`);

      // 解析模型名称
      const { sourceLang, targetLang } = parseModel(chatRequest.model);

      // 提取要翻译的文本
      const textToTranslate = extractTextToTranslate(chatRequest.messages || []);

      if (!textToTranslate) {
        return createErrorResponse('No text to translate found in user message.', 400, request, env);
      }

      console.log(`Translating text: '${textToTranslate.substring(0, 100)}...'`);

      // 执行翻译
      const translatedText = await translateText(textToTranslate, sourceLang, targetLang, env);

      // 根据是否需要流式响应返回不同格式
      if (chatRequest.stream) {
        return createStreamResponse(translatedText, chatRequest.model, request, env);
      } else {
        return createJsonResponse(translatedText, chatRequest.model, request, env);
      }

    } catch (error) {
      console.error('Error processing request:', error);
      return createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error',
        400,
        request,
        env
      );
    }
  }
};
