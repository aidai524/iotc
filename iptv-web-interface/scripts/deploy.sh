#!/bin/bash

# IPTV Explorer 部署脚本
# 用于部署到 GitHub 和 Cloudflare Pages

set -e

echo "🚀 IPTV Explorer 部署脚本"
echo "=========================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在 iptv-web-interface 目录下运行此脚本"
    exit 1
fi

# 检查 Git 状态
echo "📦 检查 Git 状态..."
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ 工作区干净，没有未提交的更改"
else
    echo "⚠️  检测到未提交的更改，请先提交代码"
    echo "   运行: git add . && git commit -m 'your message'"
    exit 1
fi

# 检查远程仓库
echo ""
echo "🔗 检查 Git 远程仓库..."
if git remote | grep -q "origin"; then
    REMOTE_URL=$(git remote get-url origin)
    echo "✅ 已配置远程仓库: $REMOTE_URL"
else
    echo "⚠️  未配置远程仓库"
    echo ""
    read -p "请输入 GitHub 仓库地址 (例如: https://github.com/username/iptv-explorer.git): " REPO_URL
    if [ -n "$REPO_URL" ]; then
        git remote add origin "$REPO_URL"
        echo "✅ 已添加远程仓库: $REPO_URL"
    else
        echo "❌ 未提供仓库地址，跳过 GitHub 推送"
    fi
fi

# 推送到 GitHub
if git remote | grep -q "origin"; then
    echo ""
    echo "📤 推送到 GitHub..."
    CURRENT_BRANCH=$(git branch --show-current)
    git push -u origin "$CURRENT_BRANCH" || {
        echo "⚠️  GitHub 推送失败，请检查仓库权限"
    }
    echo "✅ GitHub 推送完成"
fi

# 检查 Wrangler 登录状态
echo ""
echo "☁️  检查 Cloudflare 登录状态..."
if npx wrangler whoami > /dev/null 2>&1; then
    echo "✅ 已登录 Cloudflare"
else
    echo "⚠️  未登录 Cloudflare，正在打开登录页面..."
    npx wrangler login
fi

# 构建项目
echo ""
echo "🔨 构建项目..."
pnpm run pages:build || {
    echo "❌ 构建失败"
    exit 1
}
echo "✅ 构建完成"

# 部署到 Cloudflare Pages
echo ""
echo "🚀 部署到 Cloudflare Pages..."
read -p "请输入 Cloudflare Pages 项目名称 (默认: iptv-explorer): " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-iptv-explorer}

npx wrangler pages deploy .vercel/output/static --project-name="$PROJECT_NAME" || {
    echo "❌ 部署失败"
    exit 1
}

echo ""
echo "✅ 部署完成！"
echo "📝 提示:"
echo "   - 如果使用 GitHub Actions，请确保在 GitHub 仓库设置中配置了以下 Secrets:"
echo "     * CLOUDFLARE_API_TOKEN"
echo "     * CLOUDFLARE_ACCOUNT_ID"
echo "   - 查看部署状态: https://dash.cloudflare.com"
