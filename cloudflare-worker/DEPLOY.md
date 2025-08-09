# 🚀 部署指南

## 一键部署选项

### 🔘 Cloudflare Workers (推荐)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-username/DeepLXToV1Api)

**优势：**
- ✅ 全球边缘网络，延迟极低
- ✅ 自动扩缩容，无需管理服务器
- ✅ 免费额度：每天10万请求
- ✅ 零维护成本

### 🔘 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/DeepLXToV1Api&project-name=deeplx-api&repository-name=deeplx-api)

**优势：**
- ✅ 简单易用的界面
- ✅ 自动HTTPS和CDN
- ✅ 与GitHub集成
- ✅ 免费额度充足

### 🔘 Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-username/DeepLXToV1Api)

**优势：**
- ✅ 持续部署
- ✅ 表单处理和身份验证
- ✅ 分支预览
- ✅ 免费SSL证书

### 🔘 Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/your-template-id)

**优势：**
- ✅ 支持多种语言
- ✅ 数据库集成
- ✅ 简单的环境变量管理
- ✅ 自动部署

## 详细部署步骤

### Cloudflare Workers 部署

#### 方法1: 一键部署
1. 点击 [Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/?url=https://github.com/your-username/DeepLXToV1Api) 按钮
2. 登录你的Cloudflare账号
3. 选择账号和域名
4. 配置环境变量（可选）
5. 点击"Deploy"

#### 方法2: Wrangler CLI
```bash
# 安装Wrangler
npm install -g wrangler

# 登录Cloudflare
wrangler login

# 克隆项目
git clone https://github.com/your-username/DeepLXToV1Api.git
cd DeepLXToV1Api/cloudflare-worker

# 部署
wrangler deploy
```

#### 方法3: GitHub Actions
1. Fork这个仓库
2. 在仓库设置中添加Secret：
   - `CLOUDFLARE_API_TOKEN`: 你的Cloudflare API Token
3. 推送代码到main分支

### 环境变量配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `TRANSLATION_API_KEY` | DeepLX API密钥 | 空 | ❌ |
| `TRANSLATION_API_URL` | DeepLX API地址 | `https://api.deeplx.org/translate` | ❌ |

#### 在Cloudflare中设置环境变量

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的Worker
3. 进入"Settings" → "Variables"
4. 添加环境变量

#### 使用Wrangler设置环境变量

```bash
# 设置API密钥
wrangler secret put TRANSLATION_API_KEY

# 设置API地址
wrangler secret put TRANSLATION_API_URL
```

## 部署后验证

### 1. 测试API端点

```bash
curl -X POST "https://your-worker.workers.dev/v1/chat/completions" \
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

### 2. 使用可视化测试工具

打开 `test.html` 文件，输入你的Worker URL进行测试。

### 3. 检查日志

```bash
# 查看实时日志
wrangler tail

# 查看部署状态
wrangler deployments list
```

## 自定义域名

### 在Cloudflare中配置

1. 在Cloudflare Dashboard中选择你的域名
2. 进入"Workers Routes"
3. 添加路由：`api.yourdomain.com/*`
4. 选择你的Worker

### 在wrangler.toml中配置

```toml
[[routes]]
pattern = "api.yourdomain.com/*"
zone_name = "yourdomain.com"
```

## 监控和维护

### 查看分析数据

在Cloudflare Dashboard中可以查看：
- 请求数量和响应时间
- 错误率和状态码分布
- 地理分布和流量趋势

### 设置告警

1. 进入"Notifications"
2. 创建新的告警规则
3. 设置错误率或响应时间阈值

### 更新Worker

```bash
# 更新代码后重新部署
wrangler deploy

# 回滚到上一个版本
wrangler rollback
```

## 故障排除

### 常见问题

1. **部署失败**
   - 检查Worker名称是否唯一
   - 确认已正确登录Cloudflare
   - 验证wrangler.toml配置

2. **API调用失败**
   - 检查DeepLX API密钥
   - 验证API URL格式
   - 查看Worker日志

3. **CORS错误**
   - Worker已配置CORS
   - 检查请求方法和头部

### 获取帮助

- 📖 [Cloudflare Workers文档](https://developers.cloudflare.com/workers/)
- 💬 [GitHub Issues](https://github.com/your-username/DeepLXToV1Api/issues)
- 🌐 [Cloudflare社区](https://community.cloudflare.com/)

## 成本估算

### Cloudflare Workers

| 计划 | 免费额度 | 超出费用 | 适用场景 |
|------|----------|----------|----------|
| 免费版 | 10万请求/天 | - | 个人项目 |
| 付费版 | 1000万请求/月 | $0.50/百万请求 | 生产环境 |

### 其他平台

- **Vercel**: 免费版100GB带宽/月
- **Netlify**: 免费版100GB带宽/月  
- **Railway**: 免费版$5额度/月

选择最适合你需求的平台开始部署吧！
