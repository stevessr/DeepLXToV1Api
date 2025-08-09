## 🚀 多版本支持

本项目提供三个版本，满足不同的部署需求：

| 版本 | 技术栈 | 特点 | 适用场景 |
|------|--------|------|----------|
| **Python版本** | FastAPI + uvicorn | 成熟稳定，生态丰富 | 传统服务器部署 |
| **Cloudflare Worker** | JavaScript/TypeScript | 全球边缘网络，零维护 | 无服务器部署 |
| **Deno版本** | TypeScript + Deno | 现代化运行时，原生TS | 现代化部署 |

## 用法

### Python版本

仓库内已包含相关文件和目录，拉到本地后修改 docker-compose.yml 文件里的环境变量后运行`docker-compose up -d`即可。

#### 🔐 安全配置（新增）

Python版本现已支持API密钥保护和CORS源限制：

```bash
# 设置环境变量
export API_KEY_PROTECTION="sk-your-secret-key-here"
export ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"

# 或在docker-compose.yml中配置
```

### Cloudflare Worker版本

详见 [cloudflare-worker/README.md](cloudflare-worker/README.md)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-username/DeepLXToV1Api)

### Deno版本

详见 [deno-version/README.md](deno-version/README.md)

```bash
cd deno-version
deno task start
```

模型名说明：

- 示例：
    - `deeplx-EN-ZH`: 英文转中文
    - `deeplx-ZH-EN`: 中文转英文
    - `deeplx-EN`: 自动识别语言转英文
    - `deeplx-ZH`: 自动识别语言转中文

## 调用示例：

```json
{
    "messages": [
        {
            "role": "user",
            "content": [
                "Hi"
            ]
        }
    ],
    "stream": true,
    "model": "deeplx-ZH"
}
```

预期响应：

```plaintext
data: {"id": "a0e35ab6-b859-441b-93e6-6391dcb468ed", "object": "chat.completion.chunk", "created": 1709348239.833917, "model": "deeplx-ZH", "choices": [{"index": 0, "delta": {"content": "\u4f60\u597d"}, "finish_reason": null}]}

data: [DONE]


```

## 效果展示:

![image](https://github.com/Ink-Osier/DeepLXToV1Api/assets/133617214/12c60ed1-538b-4a24-8b4d-999e54f8dabd)
