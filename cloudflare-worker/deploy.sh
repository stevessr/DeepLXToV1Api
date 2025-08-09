#!/bin/bash

# DeepLX to OpenAI API - Cloudflare Worker 部署脚本

set -e

echo "🚀 开始部署 DeepLX to OpenAI API Cloudflare Worker..."

# 检查是否安装了wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI 未安装"
    echo "请运行: npm install -g wrangler"
    exit 1
fi

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo "❌ 未登录 Cloudflare"
    echo "请运行: wrangler login"
    exit 1
fi

# 检查配置文件
if [ ! -f "wrangler.toml" ]; then
    echo "❌ 未找到 wrangler.toml 配置文件"
    exit 1
fi

if [ ! -f "worker.js" ]; then
    echo "❌ 未找到 worker.js 文件"
    exit 1
fi

echo "✅ 环境检查通过"

# 询问部署环境
echo ""
echo "请选择部署环境:"
echo "1) 生产环境 (production)"
echo "2) 测试环境 (staging)"
echo "3) 本地开发 (dev)"
read -p "请输入选择 (1-3): " choice

case $choice in
    1)
        echo "🌍 部署到生产环境..."
        wrangler deploy --env production
        ;;
    2)
        echo "🧪 部署到测试环境..."
        wrangler deploy --env staging
        ;;
    3)
        echo "💻 启动本地开发环境..."
        wrangler dev
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

if [ $choice -ne 3 ]; then
    echo ""
    echo "✅ 部署完成!"
    echo ""
    echo "📋 后续步骤:"
    echo "1. 在 Cloudflare Dashboard 中配置环境变量:"
    echo "   - TRANSLATION_API_KEY: 你的 DeepLX API 密钥"
    echo "   - TRANSLATION_API_URL: DeepLX API 地址"
    echo ""
    echo "2. 测试 API 端点:"
    echo "   curl -X POST 'https://your-worker.your-subdomain.workers.dev/v1/chat/completions' \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"model\":\"deepl-ZH\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'"
    echo ""
    echo "3. 使用 test.html 进行可视化测试"
    echo ""
    echo "🔗 有用的链接:"
    echo "   - Cloudflare Dashboard: https://dash.cloudflare.com/"
    echo "   - Worker 日志: wrangler tail"
    echo "   - 本地开发: wrangler dev"
fi
