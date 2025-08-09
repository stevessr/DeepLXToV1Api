# DeepLX to OpenAI API - Cloudflare Worker版本

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-username/DeepLXToV1Api)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/your-username/DeepLXToV1Api)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?logo=cloudflare)](https://workers.cloudflare.com/)

这是DeepLX翻译服务的Cloudflare Worker版本，将DeepL翻译API包装成OpenAI Chat Completions API格式。

## 🚀 快速部署

### 一键部署 (最简单)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-username/DeepLXToV1Api)

**只需3步：**
1. 🔗 点击上方按钮
2. 🔐 登录Cloudflare账号
3. ⚡ 点击Deploy完成部署

### 更多部署选项

🌟 **[查看所有部署选项](deploy-buttons.html)** - 支持Cloudflare、Vercel、Netlify、Railway等多个平台

| 方式 | 难度 | 时间 | 说明 |
|------|------|------|------|
| 🔘 一键部署 | ⭐ | 1分钟 | 点击按钮即可 |
| 📱 Wrangler CLI | ⭐⭐ | 3分钟 | 命令行部署 |
| 🤖 GitHub Actions | ⭐⭐⭐ | 5分钟 | 自动化CI/CD |

### 其他平台一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/DeepLXToV1Api)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-username/DeepLXToV1Api)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/your-template-id)

## 功能特性

- ✅ 兼容OpenAI Chat Completions API格式
- ✅ 支持流式和非流式响应
- ✅ 自动语言检测和指定源语言翻译
- ✅ CORS支持，可直接从浏览器调用
- ✅ 无服务器架构，自动扩缩容
- ✅ 全球CDN加速

## 模型名称格式

- `deepl-ZH`: 自动检测源语言 → 中文
- `deepl-EN`: 自动检测源语言 → 英文
- `deepl-EN-ZH`: 英文 → 中文
- `deepl-ZH-EN`: 中文 → 英文
- `deepl-JA-EN`: 日文 → 英文

## 部署方式

### 方式1: 一键部署 (推荐)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-username/DeepLXToV1Api)

1. 点击上方按钮
2. 登录你的Cloudflare账号
3. 选择要部署的账号和域名
4. 配置环境变量（可选）：
   - `TRANSLATION_API_KEY`: DeepLX API密钥
   - `TRANSLATION_API_URL`: DeepLX API地址
5. 点击"Deploy"完成部署

### 方式2: 手动部署

#### 1. 安装Wrangler CLI

```bash
npm install -g wrangler
```

#### 2. 登录Cloudflare

```bash
wrangler login
```

#### 3. 克隆项目

```bash
git clone https://github.com/your-username/DeepLXToV1Api.git
cd DeepLXToV1Api/cloudflare-worker
```

#### 4. 配置环境变量

在Cloudflare Dashboard中设置环境变量，或者修改`wrangler.toml`文件：

```toml
[env.production.vars]
TRANSLATION_API_KEY = "your-deeplx-api-key"
TRANSLATION_API_URL = "https://api.deeplx.org/your-key/translate"
```

#### 5. 部署Worker

```bash
# 部署到生产环境
wrangler deploy

# 或使用自动化脚本
chmod +x deploy.sh
./deploy.sh
```

#### 6. 配置自定义域名（可选）

在`wrangler.toml`中配置路由：

```toml
[[routes]]
pattern = "api.yourdomain.com/*"
zone_name = "yourdomain.com"
```

### 方式3: GitHub Actions自动部署

1. Fork这个仓库
2. 在GitHub仓库设置中添加Secret：
   - `CLOUDFLARE_API_TOKEN`: 你的Cloudflare API Token
3. 推送代码到main分支即可自动部署

## 使用示例

### 基本翻译请求

```bash
curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepl-ZH",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ]
  }'
```

### 流式响应

```bash
curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepl-ZH",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ],
    "stream": true
  }'
```

### JavaScript调用示例

```javascript
async function translateText(text, targetLang = 'ZH') {
  const response = await fetch('https://your-worker.your-subdomain.workers.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: `deepl-${targetLang}`,
      messages: [
        {
          role: 'user',
          content: text
        }
      ]
    })
  });

  const result = await response.json();
  return result.choices[0].message.content;
}

// 使用示例
translateText('Hello World', 'ZH').then(console.log);
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `TRANSLATION_API_KEY` | DeepLX API密钥 | 空 |
| `TRANSLATION_API_URL` | DeepLX API地址 | `https://api.deeplx.org/translate` |

## 错误处理

Worker会返回标准的HTTP错误码：

- `400`: 请求格式错误或翻译失败
- `404`: 路径不存在
- `405`: 方法不允许
- `500`: 服务器内部错误

## 性能优化

- Worker运行在Cloudflare的全球边缘网络上
- 冷启动时间极短（通常<1ms）
- 自动缓存和CDN加速
- 支持高并发请求

## 监控和日志

在Cloudflare Dashboard中可以查看：

- 请求数量和响应时间
- 错误率和状态码分布
- 实时日志和调试信息
- 资源使用情况

## 限制说明

- 单个请求最大6MB
- CPU时间限制：10ms（免费版）/ 50ms（付费版）
- 内存限制：128MB
- 并发请求数：1000（免费版）/ 无限制（付费版）

## 故障排除

### 1. 翻译失败

检查DeepLX API密钥和URL是否正确配置。

### 2. CORS错误

Worker已经配置了CORS头，如果仍有问题，检查请求头是否正确。

### 3. 超时错误

检查DeepLX服务是否可用，或者尝试使用其他DeepLX实例。

## 本地开发

```bash
# 本地开发模式
wrangler dev

# 指定端口
wrangler dev --port 8787
```

## 与原版对比

| 特性 | Python版本 | Cloudflare Worker版本 |
|------|------------|----------------------|
| 部署复杂度 | 需要服务器/容器 | 一键部署 |
| 扩缩容 | 手动配置 | 自动 |
| 全球加速 | 需要CDN | 内置 |
| 成本 | 服务器费用 | 按请求计费 |
| 维护 | 需要维护服务器 | 无需维护 |
| 冷启动 | 较慢 | 极快 |
