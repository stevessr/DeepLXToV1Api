# 🔐 安全配置指南

## 概述

DeepLX to OpenAI API Worker 提供了多层安全保护机制，帮助你保护翻译服务免受未授权访问。

## 安全功能

### 1. API密钥保护 🔑

通过设置 `API_KEY_PROTECTION` 环境变量，可以要求所有请求提供有效的API密钥。

#### 配置方法

```bash
# 使用Wrangler CLI设置
wrangler secret put API_KEY_PROTECTION
# 输入你的密钥，建议格式: sk-your-secret-key-here

# 或在Cloudflare Dashboard中设置
# Workers & Pages > 你的Worker > Settings > Variables
```

#### 客户端使用

```javascript
// 方式1: Authorization头 (推荐)
fetch('https://your-worker.workers.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-your-secret-key-here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepl-ZH',
    messages: [{ role: 'user', content: 'Hello' }]
  })
});

// 方式2: X-API-Key头
fetch('https://your-worker.workers.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'X-API-Key': 'sk-your-secret-key-here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepl-ZH',
    messages: [{ role: 'user', content: 'Hello' }]
  })
});
```

### 2. CORS源限制 🌐

通过设置 `ALLOWED_ORIGINS` 环境变量，可以限制哪些域名可以访问你的API。

#### 配置方法

```bash
# 设置允许的源
wrangler secret put ALLOWED_ORIGINS
# 输入允许的源，多个用逗号分隔
```

#### 配置示例

```bash
# 单个域名
https://yourdomain.com

# 多个域名
https://yourdomain.com,https://app.yourdomain.com,https://admin.yourdomain.com

# 支持通配符
https://*.yourdomain.com

# 本地开发 + 生产环境
http://localhost:3000,http://localhost:8080,https://yourdomain.com

# 通配符端口
http://localhost:*,https://*.yourdomain.com
```

## 安全最佳实践

### 1. API密钥管理

#### ✅ 推荐做法
- 使用强密钥：至少32个字符，包含字母、数字和特殊字符
- 定期轮换密钥
- 为不同环境使用不同密钥
- 使用前缀标识密钥类型，如 `sk-prod-`, `sk-dev-`

#### ❌ 避免做法
- 不要在代码中硬编码密钥
- 不要在URL中传递密钥
- 不要使用简单或可预测的密钥
- 不要在日志中记录密钥

#### 密钥生成示例

```bash
# 生成强密钥 (Linux/macOS)
openssl rand -base64 32

# 或使用Node.js
node -e "console.log('sk-' + require('crypto').randomBytes(32).toString('hex'))"

# 示例输出: sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### 2. 环境分离

为不同环境配置不同的安全设置：

```toml
# wrangler.toml
[env.production.vars]
# 生产环境 - 严格的安全设置
API_KEY_PROTECTION = "sk-prod-your-production-key"
ALLOWED_ORIGINS = "https://yourdomain.com,https://app.yourdomain.com"

[env.staging.vars]
# 测试环境 - 相对宽松的设置
API_KEY_PROTECTION = "sk-dev-your-development-key"
ALLOWED_ORIGINS = "https://staging.yourdomain.com,http://localhost:3000"

[env.development.vars]
# 开发环境 - 最宽松的设置
# API_KEY_PROTECTION = ""  # 可选：开发时不设置
ALLOWED_ORIGINS = "http://localhost:*"
```

### 3. 监控和日志

#### 启用日志监控

```bash
# 实时查看日志
wrangler tail

# 查看特定环境的日志
wrangler tail --env production
```

#### 关键监控指标

- 401/403错误率（未授权访问尝试）
- 请求来源分布
- 异常流量模式
- API密钥使用频率

### 4. 速率限制

虽然Cloudflare Workers本身有请求限制，但你可以实现自定义速率限制：

```javascript
// 示例：简单的速率限制（可选功能）
const RATE_LIMIT = 100; // 每分钟100次请求
const rateLimitKey = `rate_limit:${clientIP}:${Math.floor(Date.now() / 60000)}`;

// 使用KV存储实现速率限制
const currentCount = await env.RATE_LIMIT_KV.get(rateLimitKey) || 0;
if (currentCount >= RATE_LIMIT) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

## 错误处理

### 常见错误码

| 状态码 | 说明 | 解决方法 |
|--------|------|----------|
| 401 | 缺少API密钥 | 在请求头中添加有效的API密钥 |
| 403 | API密钥无效或源不被允许 | 检查密钥是否正确，确认域名在允许列表中 |
| 429 | 请求过于频繁 | 降低请求频率或联系管理员 |

### 错误响应示例

```json
{
  "error": "API key required. Please provide it via Authorization header (Bearer token) or X-API-Key header."
}
```

## 安全检查清单

### 部署前检查

- [ ] 设置了强API密钥保护
- [ ] 配置了适当的CORS源限制
- [ ] 测试了所有认证场景
- [ ] 验证了错误处理机制
- [ ] 检查了环境变量配置

### 定期维护

- [ ] 轮换API密钥（建议每3-6个月）
- [ ] 审查访问日志
- [ ] 更新允许的源列表
- [ ] 监控异常访问模式
- [ ] 检查Worker性能指标

## 应急响应

### 发现未授权访问时

1. **立即行动**
   ```bash
   # 立即更换API密钥
   wrangler secret put API_KEY_PROTECTION
   
   # 限制CORS源到最小范围
   wrangler secret put ALLOWED_ORIGINS
   ```

2. **调查分析**
   ```bash
   # 查看最近的访问日志
   wrangler tail --since 1h
   
   # 检查Worker分析数据
   # 在Cloudflare Dashboard中查看请求统计
   ```

3. **加强防护**
   - 启用更严格的CORS限制
   - 考虑添加速率限制
   - 通知相关团队成员

### 紧急停用服务

```bash
# 临时禁用Worker
wrangler delete

# 或者设置一个无效的API密钥强制所有请求失败
wrangler secret put API_KEY_PROTECTION
# 输入: DISABLED
```

## 合规性考虑

### 数据保护

- Worker不存储翻译内容
- 所有请求都通过HTTPS加密
- 支持欧盟GDPR合规性
- 可配置数据处理地区

### 审计日志

- Cloudflare提供详细的访问日志
- 支持导出日志用于合规审计
- 可集成第三方SIEM系统

记住：安全是一个持续的过程，定期审查和更新你的安全配置！
