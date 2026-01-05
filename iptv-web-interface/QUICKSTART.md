# 快速开始指南

## 🚀 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器
pnpm dev

# 3. 访问 http://localhost:3000
```

## ☁️ 部署到 Cloudflare Pages

### 方法 1：通过 Dashboard（最简单）

1. 将代码推送到 GitHub/GitLab/Bitbucket
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
3. 进入 **Workers & Pages** → **Create application** → **Pages**
4. 连接 Git 仓库
5. 配置构建设置：
   - **Build command**: `pnpm run pages:build`
   - **Build output directory**: `.vercel/output/static`
   - **Root directory**: `iptv-web-interface`（如果项目在子目录）
6. 点击 **Save and Deploy**

### 方法 2：通过 CLI

```bash
# 1. 登录 Cloudflare
npx wrangler login

# 2. 构建项目
pnpm run pages:build

# 3. 部署
pnpm run pages:deploy
```

### 方法 3：GitHub Actions（自动部署）

1. 在 GitHub 仓库设置中添加 Secrets：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
2. 推送代码到 `main` 分支
3. GitHub Actions 会自动部署

## 📝 重要文件

- `DEPLOY.md` - 详细部署文档
- `wrangler.toml` - Cloudflare 配置
- `.github/workflows/deploy-cloudflare.yml` - CI/CD 工作流

## ⚠️ 注意事项

1. **Vercel Analytics**: 项目包含 `@vercel/analytics`，在 Cloudflare 上可能不工作。如需移除：
   - 删除 `app/layout.tsx` 中的 `<Analytics />` 组件
   - 或替换为 Cloudflare Web Analytics

2. **Node.js 版本**: 确保使用 Node.js 18+ 版本

3. **构建输出**: Cloudflare Pages 使用 `.vercel/output/static` 目录

## 🐛 遇到问题？

查看 [DEPLOY.md](./DEPLOY.md) 中的常见问题部分。
