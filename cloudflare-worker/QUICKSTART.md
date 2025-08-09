# 🚀 快速开始指南

## 5分钟部署DeepLX翻译API到Cloudflare Worker

### 前提条件
- Cloudflare账号（免费即可）
- Node.js 16+ 
- DeepLX API密钥（可选，有免费额度）

### 步骤1：安装工具
```bash
# 安装Wrangler CLI
npm install -g wrangler

# 验证安装
wrangler --version
```

### 步骤2：登录Cloudflare
```bash
wrangler login
```
这会打开浏览器，登录你的Cloudflare账号并授权。

### 步骤3：克隆或下载文件
将以下文件保存到本地目录：
- `worker.js` (或 `worker.ts`)
- `wrangler.toml`
- `package.json`

### 步骤4：配置项目
```bash
# 进入项目目录
cd cloudflare-worker

# 安装依赖（可选）
npm install

# 编辑wrangler.toml，修改worker名称
# name = "your-unique-worker-name"
```

### 步骤5：部署
```bash
# 一键部署
wrangler deploy

# 或使用部署脚本
chmod +x deploy.sh
./deploy.sh
```

### 步骤6：配置环境变量（可选）
在Cloudflare Dashboard中设置：
- `TRANSLATION_API_KEY`: 你的DeepLX API密钥
- `TRANSLATION_API_URL`: DeepLX API地址

或者使用命令行：
```bash
wrangler secret put TRANSLATION_API_KEY
wrangler secret put TRANSLATION_API_URL
```

### 步骤7：测试API
```bash
# 获取Worker URL
wrangler whoami

# 测试翻译
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

### 步骤8：可视化测试
打开 `test.html` 文件，输入你的Worker URL进行可视化测试。

## 🎉 完成！

你的DeepLX翻译API现在已经部署到全球边缘网络，支持：
- ✅ OpenAI Chat Completions API格式
- ✅ 流式和非流式响应
- ✅ 全球低延迟访问
- ✅ 自动扩缩容
- ✅ 零维护

## 常用命令

```bash
# 查看实时日志
wrangler tail

# 本地开发
wrangler dev

# 查看部署状态
wrangler deployments list

# 删除Worker
wrangler delete
```

## 下一步

1. **自定义域名**: 在Cloudflare Dashboard中配置自定义域名
2. **监控设置**: 查看Worker的分析数据和日志
3. **优化配置**: 根据使用情况调整环境变量
4. **集成应用**: 将API集成到你的应用中

## 故障排除

### 部署失败
- 检查Worker名称是否唯一
- 确认已正确登录Cloudflare
- 验证wrangler.toml配置

### API调用失败
- 检查DeepLX API密钥是否正确
- 验证API URL格式
- 查看Worker日志：`wrangler tail`

### CORS错误
- Worker已配置CORS，检查请求头
- 确认使用正确的HTTP方法（POST）

需要帮助？查看完整文档或提交Issue。
