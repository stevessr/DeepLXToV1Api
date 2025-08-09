# DeepLX to OpenAI API - Deno版本

🦕 使用Deno运行时的DeepLX翻译服务，将DeepL翻译API包装成OpenAI Chat Completions API格式。

## 🌟 特性

- ✅ 兼容OpenAI Chat Completions API格式
- ✅ 支持流式和非流式响应
- ✅ 自动语言检测和指定源语言翻译
- ✅ 可选的API密钥保护
- ✅ 可配置的CORS源限制
- ✅ TypeScript原生支持
- ✅ 零配置，开箱即用
- ✅ 现代化的Deno运行时

## 🚀 快速开始

### 安装Deno

```bash
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex

# 或使用包管理器
# macOS: brew install deno
# Windows: choco install deno
```

### 运行服务

```bash
# 克隆项目
git clone https://github.com/your-username/DeepLXToV1Api.git
cd DeepLXToV1Api/deno-version

# 直接运行
deno run --allow-net --allow-env main.ts

# 或使用任务
deno task start

# 开发模式（自动重载）
deno task dev
```

### 环境变量配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
nano .env
```

## 📋 环境变量

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `PORT` | 服务端口 | `8000` | ❌ |
| `TRANSLATION_API_KEY` | DeepLX API密钥 | 空 | ❌ |
| `TRANSLATION_API_URL` | DeepLX API地址 | `https://api.deeplx.org/translate` | ❌ |
| `API_KEY_PROTECTION` | API保护密钥 | 空 | ❌ |
| `ALLOWED_ORIGINS` | 允许的CORS源 | `*` | ❌ |

## 🔐 安全配置

### API密钥保护

```bash
# 设置保护密钥
export API_KEY_PROTECTION="sk-your-secret-key-here"

# 或在.env文件中设置
echo "API_KEY_PROTECTION=sk-your-secret-key-here" >> .env
```

客户端调用时需要提供密钥：

```bash
# 使用Authorization头
curl -X POST "http://localhost:8000/v1/chat/completions" \
  -H "Authorization: Bearer sk-your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepl-ZH","messages":[{"role":"user","content":"Hello"}]}'

# 使用X-API-Key头
curl -X POST "http://localhost:8000/v1/chat/completions" \
  -H "X-API-Key: sk-your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepl-ZH","messages":[{"role":"user","content":"Hello"}]}'
```

### CORS源限制

```bash
# 限制特定域名
export ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"

# 支持通配符
export ALLOWED_ORIGINS="https://*.yourdomain.com,http://localhost:*"
```

## 🎯 使用示例

### 基本翻译

```typescript
const response = await fetch('http://localhost:8000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // 如果启用了API保护
    // 'Authorization': 'Bearer sk-your-secret-key-here'
  },
  body: JSON.stringify({
    model: 'deepl-ZH',
    messages: [
      {
        role: 'user',
        content: 'Hello, how are you today?'
      }
    ]
  })
});

const result = await response.json();
console.log(result.choices[0].message.content);
```

### 流式翻译

```typescript
const response = await fetch('http://localhost:8000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepl-ZH',
    messages: [{ role: 'user', content: 'Hello World' }],
    stream: true
  })
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader!.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  console.log(chunk);
}
```

## 🛠️ 开发

### 项目结构

```
deno-version/
├── main.ts           # 主服务文件
├── deno.json         # Deno配置文件
├── .env.example      # 环境变量示例
├── README.md         # 说明文档
└── tests/            # 测试文件
    └── main_test.ts
```

### 可用任务

```bash
# 启动服务
deno task start

# 开发模式
deno task dev

# 类型检查
deno task check

# 代码格式化
deno task fmt

# 代码检查
deno task lint

# 运行测试
deno task test
```

### 代码质量

```bash
# 格式化代码
deno fmt

# 检查代码质量
deno lint

# 类型检查
deno check main.ts
```

## 🐳 Docker部署

创建Dockerfile：

```dockerfile
FROM denoland/deno:1.38.0

WORKDIR /app

# 复制依赖文件
COPY deno.json .
COPY main.ts .

# 缓存依赖
RUN deno cache main.ts

# 暴露端口
EXPOSE 8000

# 启动服务
CMD ["deno", "run", "--allow-net", "--allow-env", "main.ts"]
```

构建和运行：

```bash
# 构建镜像
docker build -t deeplx-deno .

# 运行容器
docker run -p 8000:8000 \
  -e API_KEY_PROTECTION=sk-your-key \
  -e ALLOWED_ORIGINS=https://yourdomain.com \
  deeplx-deno
```

## 🌐 部署选项

### 1. Deno Deploy (推荐)

```bash
# 安装deployctl
deno install --allow-read --allow-write --allow-env --allow-net --allow-run --no-check -r -f https://deno.land/x/deploy/deployctl.ts

# 部署到Deno Deploy
deployctl deploy --project=your-project main.ts
```

### 2. 传统服务器

```bash
# 使用PM2管理进程
npm install -g pm2

# 启动服务
pm2 start "deno run --allow-net --allow-env main.ts" --name deeplx-api

# 查看状态
pm2 status
```

### 3. Systemd服务

创建 `/etc/systemd/system/deeplx-api.service`：

```ini
[Unit]
Description=DeepLX to OpenAI API - Deno
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/deeplx-api
ExecStart=/home/user/.deno/bin/deno run --allow-net --allow-env main.ts
Restart=always
Environment=PORT=8000

[Install]
WantedBy=multi-user.target
```

## 🔍 监控和日志

### 内置日志

服务会输出详细的请求日志：

```
🚀 DeepLX to OpenAI API Server starting on port 8000
🔐 API Protection: Enabled
🌐 CORS Origins: https://yourdomain.com
🔗 Translation API: https://api.deeplx.org/translate
Received request for model: deepl-ZH
Translating text: 'Hello World...'
Translation from 'auto' to 'ZH' took: 0.45s
```

### 性能监控

```typescript
// 添加性能监控中间件
const startTime = performance.now();
// ... 处理请求
const endTime = performance.now();
console.log(`Request processed in ${endTime - startTime}ms`);
```

## 🆚 与其他版本对比

| 特性 | Python版本 | Cloudflare Worker | Deno版本 |
|------|------------|------------------|----------|
| **运行时** | Python 3.8+ | V8 JavaScript | Deno |
| **类型安全** | ❌ | ✅ (TypeScript) | ✅ (原生) |
| **部署复杂度** | 中等 | 简单 | 简单 |
| **性能** | 中等 | 高 | 高 |
| **开发体验** | 好 | 好 | 优秀 |
| **生态系统** | 丰富 | 有限 | 现代化 |

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License
