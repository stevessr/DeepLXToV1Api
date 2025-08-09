/**
 * DeepLX to OpenAI API - Deno版本
 * 将DeepL翻译服务包装成OpenAI Chat Completions API格式
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { cors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

// 配置接口
interface Config {
  TRANSLATION_API_KEY: string;
  TRANSLATION_API_URL: string;
  API_KEY_PROTECTION: string;
  ALLOWED_ORIGINS: string;
  PORT: number;
}

// 聊天消息接口
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string }>;
}

// 聊天请求接口
interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

// 翻译响应接口
interface TranslationResponse {
  code: number;
  data: string;
  message?: string;
}

// 获取配置
function getConfig(): Config {
  return {
    TRANSLATION_API_KEY: Deno.env.get("TRANSLATION_API_KEY") || "",
    TRANSLATION_API_URL:
      Deno.env.get("TRANSLATION_API_URL") ||
      `https://api.deeplx.org/${
        Deno.env.get("TRANSLATION_API_KEY") || ""
      }/translate`,
    API_KEY_PROTECTION: Deno.env.get("API_KEY_PROTECTION") || "",
    ALLOWED_ORIGINS: Deno.env.get("ALLOWED_ORIGINS") || "*",
    PORT: parseInt(Deno.env.get("PORT") || "8000"),
  };
}

// 生成UUID
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 验证API密钥
function validateApiKey(
  request: Request,
  config: Config
): { valid: boolean; error?: string; status?: number } {
  if (!config.API_KEY_PROTECTION) {
    return { valid: true };
  }

  const authHeader = request.headers.get("Authorization") || "";
  const apiKeyHeader =
    request.headers.get("X-API-Key") || request.headers.get("api-key");

  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const providedKey = apiKeyHeader || bearerToken;

  if (!providedKey) {
    return {
      valid: false,
      error:
        "API key required. Please provide it via Authorization header (Bearer token) or X-API-Key header.",
      status: 401,
    };
  }

  if (providedKey !== config.API_KEY_PROTECTION) {
    return {
      valid: false,
      error: "Invalid API key.",
      status: 403,
    };
  }

  return { valid: true };
}

// 验证来源
function validateOrigin(
  request: Request,
  config: Config
): { valid: boolean; error?: string; status?: number; origin?: string } {
  if (!config.ALLOWED_ORIGINS || config.ALLOWED_ORIGINS === "*") {
    return { valid: true, origin: "*" };
  }

  const origin = request.headers.get("Origin");
  const allowedList = config.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

  if (origin && allowedList.includes(origin)) {
    return { valid: true, origin };
  }

  for (const allowed of allowedList) {
    if (allowed === "*") {
      return { valid: true, origin: "*" };
    }
    if (allowed.includes("*")) {
      const regex = new RegExp(allowed.replace(/\*/g, ".*"));
      if (origin && regex.test(origin)) {
        return { valid: true, origin };
      }
    }
  }

  if (!origin) {
    return { valid: true, origin: "*" };
  }

  return {
    valid: false,
    error: `Origin '${origin}' not allowed.`,
    status: 403,
    origin: "null",
  };
}

// 获取CORS头
function getCorsHeaders(
  request: Request,
  config: Config
): Record<string, string> {
  const originCheck = validateOrigin(request, config);

  return {
    "Access-Control-Allow-Origin": originCheck.origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-API-Key, api-key",
    "Access-Control-Max-Age": "86400",
  };
}

// 解析模型名称
function parseModel(model: string): { sourceLang: string; targetLang: string } {
  const modelParts = model.split("-");
  let sourceLang = "auto";
  let targetLang = "";

  if (modelParts.length === 2) {
    targetLang = modelParts[1];
  } else if (modelParts.length === 3) {
    sourceLang = modelParts[1];
    targetLang = modelParts[2];
  } else {
    throw new Error(
      'Invalid model format. Use "deepl-TARGET" for auto-detection or "deepl-SOURCE-TARGET".'
    );
  }

  return { sourceLang, targetLang };
}

// 提取要翻译的文本
function extractTextToTranslate(messages: ChatMessage[]): string {
  for (const message of messages) {
    if (message.role === "user") {
      const content = message.content || "";

      let actualTextContent = "";
      if (typeof content === "string") {
        actualTextContent = content;
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part === "object" && part.type === "text" && part.text) {
            actualTextContent = part.text;
            break;
          }
        }
      }

      if (actualTextContent) {
        try {
          const startMarker = "Source Text: ";
          const endMarker = "\n\nTranslated Text:";
          const startIndex = actualTextContent.indexOf(startMarker);
          const endIndex = actualTextContent.indexOf(
            endMarker,
            startIndex + startMarker.length
          );

          if (startIndex !== -1 && endIndex !== -1) {
            return actualTextContent
              .substring(startIndex + startMarker.length, endIndex)
              .trim();
          }
        } catch (e) {
          // 如果解析失败，使用整个内容
        }
        return actualTextContent.trim();
      }
      break;
    }
  }
  return "";
}

// 翻译文本
async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  config: Config
): Promise<string> {
  if (!text.trim() || sourceLang === targetLang) {
    return text;
  }

  const apiUrl =
    config.TRANSLATION_API_URL || "https://api.deeplx.org/translate";

  const payload: any = {
    text: text,
    target_lang: targetLang,
  };

  if (sourceLang && sourceLang !== "auto") {
    payload.source_lang = sourceLang;
  }

  const startTime = Date.now();

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const elapsed = (Date.now() - startTime) / 1000;
    console.log(
      `Translation from '${
        sourceLang || "auto"
      }' to '${targetLang}' took: ${elapsed.toFixed(2)}s`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Translation failed with status ${response.status}: ${errorText}`
      );
      throw new Error(`Translation service returned status ${response.status}`);
    }

    const result: TranslationResponse = await response.json();
    if (result.code !== 200) {
      console.error("Translation API error:", result);
      throw new Error(
        `Translation API error: ${result.message || "Unknown error"}`
      );
    }

    return result.data || "";
  } catch (error) {
    console.error("Error during translation:", error);
    throw new Error(
      `Error connecting to translation service: ${error.message}`
    );
  }
}

// 创建错误响应
function createErrorResponse(
  message: string,
  status: number = 400,
  request: Request,
  config: Config
): Response {
  const corsHeaders = getCorsHeaders(request, config);

  return new Response(JSON.stringify({ error: message }), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

// 创建流式响应
function createStreamResponse(
  translatedText: string,
  model: string,
  request: Request,
  config: Config
): Response {
  const chatId = "chatcmpl-" + generateUUID();
  const createdTime = Math.floor(Date.now() / 1000);

  const chunkData = {
    id: chatId,
    object: "chat.completion.chunk",
    created: createdTime,
    model: model,
    choices: [
      {
        index: 0,
        delta: { content: translatedText },
        finish_reason: null,
      },
    ],
  };

  const finalChunk = {
    id: chatId,
    object: "chat.completion.chunk",
    created: createdTime,
    model: model,
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: "stop",
      },
    ],
  };

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(`data: ${JSON.stringify(chunkData)}\n\n`);
      controller.enqueue(`data: ${JSON.stringify(finalChunk)}\n\n`);
      controller.enqueue("data: [DONE]\n\n");
      controller.close();
    },
  });

  const corsHeaders = getCorsHeaders(request, config);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...corsHeaders,
    },
  });
}

// 创建JSON响应
function createJsonResponse(
  translatedText: string,
  model: string,
  request: Request,
  config: Config
): Response {
  const responseData = {
    id: "chatcmpl-" + generateUUID(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: translatedText,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };

  const corsHeaders = getCorsHeaders(request, config);

  return new Response(JSON.stringify(responseData), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

// 主处理函数
async function handler(request: Request): Promise<Response> {
  const config = getConfig();

  try {
    // 处理CORS预检请求
    if (request.method === "OPTIONS") {
      const corsHeaders = getCorsHeaders(request, config);
      return new Response(null, { headers: corsHeaders });
    }

    // 只处理POST请求到/v1/chat/completions
    if (request.method !== "POST") {
      return createErrorResponse("Method not allowed", 405, request, config);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/v1/chat/completions") {
      return createErrorResponse("Not found", 404, request, config);
    }

    // 验证API密钥
    const keyValidation = validateApiKey(request, config);
    if (!keyValidation.valid) {
      return createErrorResponse(
        keyValidation.error!,
        keyValidation.status!,
        request,
        config
      );
    }

    // 验证CORS源
    const originValidation = validateOrigin(request, config);
    if (!originValidation.valid) {
      return createErrorResponse(
        originValidation.error!,
        originValidation.status!,
        request,
        config
      );
    }

    const chatRequest: ChatRequest = await request.json();
    console.log(`Received request for model: ${chatRequest.model}`);

    // 解析模型名称
    const { sourceLang, targetLang } = parseModel(chatRequest.model);

    // 提取要翻译的文本
    const textToTranslate = extractTextToTranslate(chatRequest.messages || []);

    if (!textToTranslate) {
      return createErrorResponse(
        "No text to translate found in user message.",
        400,
        request,
        config
      );
    }

    console.log(`Translating text: '${textToTranslate.substring(0, 100)}...'`);

    // 执行翻译
    const translatedText = await translateText(
      textToTranslate,
      sourceLang,
      targetLang,
      config
    );

    // 根据是否需要流式响应返回不同格式
    if (chatRequest.stream) {
      return createStreamResponse(
        translatedText,
        chatRequest.model,
        request,
        config
      );
    } else {
      return createJsonResponse(
        translatedText,
        chatRequest.model,
        request,
        config
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Unknown error",
      400,
      request,
      config
    );
  }
}

// 启动服务器
async function main() {
  const config = getConfig();

  console.log(`🚀 DeepLX to OpenAI API Server starting on port ${config.PORT}`);
  console.log(
    `🔐 API Protection: ${config.API_KEY_PROTECTION ? "Enabled" : "Disabled"}`
  );
  console.log(`🌐 CORS Origins: ${config.ALLOWED_ORIGINS}`);
  console.log(`🔗 Translation API: ${config.TRANSLATION_API_URL}`);

  await serve(handler, { port: config.PORT });
}

// 运行服务器
if (import.meta.main) {
  main().catch(console.error);
}
