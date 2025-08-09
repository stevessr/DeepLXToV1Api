# 🔐 安全配置指南

本项目的所有版本（Python、Cloudflare Worker、Deno）都支持统一的安全配置。

## 🛡️ 安全功能

### 1. API密钥保护

通过设置 `API_KEY_PROTECTION` 环境变量，要求客户端提供有效的API密钥才能访问翻译服务。

### 2. CORS源限制

通过设置 `ALLOWED_ORIGINS` 环境变量，限制哪些域名可以访问你的API。

## 📋 环境变量

| 变量名 | 说明 | 默认值 | 支持版本 |
|--------|------|--------|----------|
| `API_KEY_PROTECTION` | API保护密钥 | 空（不保护） | 全部 |
| `ALLOWED_ORIGINS` | 允许的CORS源 | `*`（允许所有） | 全部 |

## 🔧 配置方法

### Python版本

```bash
# 环境变量
export API_KEY_PROTECTION="sk-your-secret-key-here"
export ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"

# Docker Compose
# 在docker-compose.yml中添加：
environment:
  - API_KEY_PROTECTION=sk-your-secret-key-here
  - ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Cloudflare Worker版本

```bash
# 使用Wrangler CLI
wrangler secret put API_KEY_PROTECTION
wrangler secret put ALLOWED_ORIGINS

# 或在Cloudflare Dashboard中设置
# Workers & Pages > 你的Worker > Settings > Variables
```

### Deno版本

```bash
# 环境变量
export API_KEY_PROTECTION="sk-your-secret-key-here"
export ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"

# .env文件
echo "API_KEY_PROTECTION=sk-your-secret-key-here" >> .env
echo "ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com" >> .env
```

## 🔑 API密钥使用

### 生成强密钥

```bash
# 使用OpenSSL生成
openssl rand -base64 32

# 使用Node.js生成
node -e "console.log('sk-' + require('crypto').randomBytes(32).toString('hex'))"

# 使用Python生成
python -c "import secrets; print('sk-' + secrets.token_hex(32))"

# 示例输出: sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### 客户端调用

#### 方式1: Authorization头（推荐）

```bash
curl -X POST "https://your-api.com/v1/chat/completions" \
  -H "Authorization: Bearer sk-your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepl-ZH","messages":[{"role":"user","content":"Hello"}]}'
```

```javascript
fetch('https://your-api.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-your-secret-key-here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepl-ZH',
    messages: [{ role: 'user', content: 'Hello World' }]
  })
});
```

#### 方式2: X-API-Key头

```bash
curl -X POST "https://your-api.com/v1/chat/completions" \
  -H "X-API-Key: sk-your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepl-ZH","messages":[{"role":"user","content":"Hello"}]}'
```

```javascript
fetch('https://your-api.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'X-API-Key': 'sk-your-secret-key-here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepl-ZH',
    messages: [{ role: 'user', content: 'Hello World' }]
  })
});
```

## 🌐 CORS配置

### 配置示例

```bash
# 单个域名
ALLOWED_ORIGINS=https://yourdomain.com

# 多个域名
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com,https://admin.yourdomain.com

# 支持通配符
ALLOWED_ORIGINS=https://*.yourdomain.com

# 本地开发 + 生产环境
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,https://yourdomain.com

# 通配符端口
ALLOWED_ORIGINS=http://localhost:*,https://*.yourdomain.com

# 允许所有源（默认，不推荐生产环境）
ALLOWED_ORIGINS=*
```

### 通配符规则

- `*` - 匹配任意字符
- `https://*.example.com` - 匹配所有example.com的子域名
- `http://localhost:*` - 匹配localhost的任意端口

## 🚨 错误响应

### 401 - 缺少API密钥

```json
{
  "error": "API key required. Please provide it via Authorization header (Bearer token) or X-API-Key header."
}
```

### 403 - API密钥无效

```json
{
  "error": "Invalid API key."
}
```

### 403 - 源不被允许

```json
{
  "error": "Origin 'https://unauthorized.com' not allowed."
}
```

## 🔒 安全最佳实践

### 1. 密钥管理

- ✅ 使用强密钥（至少32个字符）
- ✅ 定期轮换密钥
- ✅ 为不同环境使用不同密钥
- ✅ 使用环境变量或密钥管理服务
- ❌ 不要在代码中硬编码密钥
- ❌ 不要在日志中记录密钥

### 2. CORS配置

- ✅ 生产环境限制特定域名
- ✅ 使用HTTPS协议
- ✅ 定期审查允许的源
- ❌ 生产环境不要使用 `*`
- ❌ 不要允许不必要的域名

### 3. 环境分离

```bash
# 生产环境 - 严格安全
API_KEY_PROTECTION=sk-prod-strong-key-here
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# 测试环境 - 中等安全
API_KEY_PROTECTION=sk-test-key-here
ALLOWED_ORIGINS=https://staging.yourdomain.com,http://localhost:3000

# 开发环境 - 宽松安全
API_KEY_PROTECTION=  # 可选
ALLOWED_ORIGINS=http://localhost:*
```

## 🔍 监控和审计

### 日志监控

所有版本都会记录以下安全相关日志：

- API密钥验证失败
- CORS源验证失败
- 请求来源和用户代理
- 翻译请求详情

### 关键指标

- 401/403错误率
- 请求来源分布
- API密钥使用频率
- 异常访问模式

### 告警设置

建议为以下情况设置告警：

- 401/403错误率超过阈值
- 来自未知源的大量请求
- API密钥暴力破解尝试

## 🆘 应急响应

### 发现安全问题时

1. **立即更换API密钥**
   ```bash
   # 生成新密钥
   openssl rand -base64 32
   
   # 更新环境变量
   export API_KEY_PROTECTION="new-key-here"
   ```

2. **限制CORS源**
   ```bash
   # 临时限制到最小范围
   export ALLOWED_ORIGINS="https://trusted-domain.com"
   ```

3. **检查访问日志**
   - 分析异常请求模式
   - 识别攻击来源
   - 评估影响范围

4. **通知相关人员**
   - 更新客户端配置
   - 通知开发团队
   - 记录安全事件

### 紧急停用服务

```bash
# 方法1: 设置无效密钥
export API_KEY_PROTECTION="DISABLED"

# 方法2: 限制CORS到空
export ALLOWED_ORIGINS=""

# 方法3: 停止服务
# Python: docker-compose down
# Cloudflare: wrangler delete
# Deno: pkill -f deno
```

## 📚 相关文档

- [Cloudflare Worker安全配置](cloudflare-worker/SECURITY.md)
- [部署指南](DEPLOY.md)
- [API文档](API.md)

记住：安全是一个持续的过程，定期审查和更新你的安全配置！
