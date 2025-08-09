import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

// 测试配置
const TEST_PORT = 8001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// 启动测试服务器
async function startTestServer() {
  const process = new Deno.Command("deno", {
    args: ["run", "--allow-net", "--allow-env", "../main.ts"],
    env: {
      PORT: TEST_PORT.toString(),
      API_KEY_PROTECTION: "test-key-123",
      ALLOWED_ORIGINS: "http://localhost:3000,https://test.com"
    },
    stdout: "piped",
    stderr: "piped"
  });

  const child = process.spawn();
  
  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return child;
}

// 测试基本翻译功能
Deno.test("Basic translation test", async () => {
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test-key-123"
    },
    body: JSON.stringify({
      model: "deepl-ZH",
      messages: [
        {
          role: "user",
          content: "Hello"
        }
      ]
    })
  });

  assertEquals(response.status, 200);
  
  const result = await response.json();
  assertExists(result.choices);
  assertEquals(result.choices.length, 1);
  assertExists(result.choices[0].message.content);
});

// 测试API密钥验证
Deno.test("API key validation test", async () => {
  // 测试缺少API密钥
  const response1 = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepl-ZH",
      messages: [{ role: "user", content: "Hello" }]
    })
  });

  assertEquals(response1.status, 401);

  // 测试错误的API密钥
  const response2 = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer wrong-key"
    },
    body: JSON.stringify({
      model: "deepl-ZH",
      messages: [{ role: "user", content: "Hello" }]
    })
  });

  assertEquals(response2.status, 403);
});

// 测试CORS预检请求
Deno.test("CORS preflight test", async () => {
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "OPTIONS",
    headers: {
      "Origin": "https://test.com",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "Content-Type, Authorization"
    }
  });

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), "https://test.com");
  assertEquals(response.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
});

// 测试流式响应
Deno.test("Streaming response test", async () => {
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test-key-123"
    },
    body: JSON.stringify({
      model: "deepl-ZH",
      messages: [{ role: "user", content: "Hello" }],
      stream: true
    })
  });

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Content-Type"), "text/event-stream");

  const reader = response.body?.getReader();
  assertExists(reader);

  const { value } = await reader.read();
  assertExists(value);

  const chunk = new TextDecoder().decode(value);
  assertEquals(chunk.startsWith("data: "), true);
});

// 测试模型名称解析
Deno.test("Model name parsing test", async () => {
  // 测试有效的模型名称
  const response1 = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test-key-123"
    },
    body: JSON.stringify({
      model: "deepl-EN-ZH",
      messages: [{ role: "user", content: "Hello" }]
    })
  });

  assertEquals(response1.status, 200);

  // 测试无效的模型名称
  const response2 = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test-key-123"
    },
    body: JSON.stringify({
      model: "invalid-model",
      messages: [{ role: "user", content: "Hello" }]
    })
  });

  assertEquals(response2.status, 400);
});

// 测试错误处理
Deno.test("Error handling test", async () => {
  // 测试空消息
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test-key-123"
    },
    body: JSON.stringify({
      model: "deepl-ZH",
      messages: []
    })
  });

  assertEquals(response.status, 400);
  
  const result = await response.json();
  assertExists(result.error);
});

// 测试不同的HTTP方法
Deno.test("HTTP method validation test", async () => {
  // 测试GET请求
  const response1 = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "GET"
  });

  assertEquals(response1.status, 405);

  // 测试PUT请求
  const response2 = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "PUT"
  });

  assertEquals(response2.status, 405);
});

// 测试路径验证
Deno.test("Path validation test", async () => {
  const response = await fetch(`${BASE_URL}/invalid/path`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test-key-123"
    },
    body: JSON.stringify({
      model: "deepl-ZH",
      messages: [{ role: "user", content: "Hello" }]
    })
  });

  assertEquals(response.status, 404);
});
