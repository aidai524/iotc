# Cloudflare Pages 部署指南

本指南将帮助你将 IPTV Explorer 部署到 Cloudflare Pages。

## 📋 前置要求

1. **Cloudflare 账号**：如果没有，请访问 [cloudflare.com](https://www.cloudflare.com) 注册
2. **Wrangler CLI**：Cloudflare 官方 CLI 工具（已包含在项目依赖中）
3. **Git 仓库**：将代码推送到 GitHub/GitLab/Bitbucket

---

## 🚀 部署方式

### 方式一：通过 Cloudflare Dashboard（推荐）

这是最简单的方式，适合首次部署。

#### 1. 准备代码仓库

确保代码已推送到 Git 仓库（GitHub/GitLab/Bitbucket）。

#### 2. 在 Cloudflare Dashboard 中创建项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages**
3. 点击 **Create application**
4. 选择 **Pages** 标签
5. 点击 **Connect to Git**
6. 选择你的 Git 提供商（GitHub/GitLab/Bitbucket）
7. 授权 Cloudflare 访问你的仓库
8. 选择 `iptv-web-interface` 仓库

#### 3. 配置构建设置

在项目设置页面，配置以下参数：

| 配置项 | 值 |
|--------|-----|
| **Framework preset** | `Next.js (Static HTML Export)` 或 `None` |
| **Production branch** | `main` 或 `master` |
| **Build command** | `npm run pages:build` 或 `pnpm pages:build` |
| **Build output directory** | `.vercel/output/static` |
| **Root directory** | `iptv-web-interface`（如果项目在子目录） |

#### 4. 环境变量（可选）

如果需要设置环境变量，在 **Environment variables** 部分添加：

```
NODE_VERSION=20
```

#### 5. 开始部署

点击 **Save and Deploy**，Cloudflare 会自动：
- 安装依赖
- 运行构建命令
- 部署到全球 CDN

---

### 方式二：使用 GitHub Actions（CI/CD）

项目已包含 GitHub Actions 工作流，可以实现自动部署。

#### 1. 配置 Secrets

在 GitHub 仓库设置中添加以下 Secrets：

- `CLOUDFLARE_API_TOKEN`: Cloudflare API Token
  - 获取方式：Cloudflare Dashboard → My Profile → API Tokens → Create Token
  - 权限：Account → Cloudflare Pages → Edit
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID
  - 获取方式：Cloudflare Dashboard → 右侧边栏可以看到 Account ID

#### 2. 推送代码

将代码推送到 `main` 或 `master` 分支，GitHub Actions 会自动：
- 安装依赖
- 构建项目
- 部署到 Cloudflare Pages

#### 3. 查看部署状态

在 GitHub 仓库的 **Actions** 标签页查看部署状态。

---

### 方式三：使用 Wrangler CLI（命令行）

适合需要更多控制的场景，或 CI/CD 集成。

#### 1. 安装依赖

```bash
cd iptv-web-interface
pnpm install
```

#### 2. 登录 Cloudflare

```bash
npx wrangler login
```

这会打开浏览器，完成登录授权。

#### 3. 构建项目

```bash
pnpm run pages:build
```

这会运行 `@cloudflare/next-on-pages`，生成 Cloudflare 兼容的构建输出。

#### 4. 部署到 Cloudflare Pages

```bash
npx wrangler pages deploy .vercel/output/static --project-name=iptv-explorer
```

或者使用项目配置的脚本：

```bash
pnpm run pages:deploy
```

#### 5. 查看部署状态

部署完成后，Wrangler 会显示部署 URL，例如：
```
✨ Deployment complete! Take a look at your deployed site:
   https://iptv-explorer.pages.dev
```

---

## 🔧 本地开发与测试

### 本地预览 Cloudflare 构建

在部署前，可以在本地测试 Cloudflare 构建：

```bash
# 构建项目
pnpm run pages:build

# 启动本地预览服务器
pnpm run pages:dev
```

或者分步执行：

```bash
npx @cloudflare/next-on-pages
npx wrangler pages dev .vercel/output/static --compatibility-flag=nodejs_compat
```

访问 `http://localhost:8788` 查看预览。

---

## 📝 构建脚本说明

项目包含以下构建相关脚本：

- **`pages:build`**: 使用 `@cloudflare/next-on-pages` 构建项目
- **`pages:dev`**: 构建并启动本地预览服务器
- **`pages:deploy`**: 构建并部署到 Cloudflare Pages

---

## ⚙️ 配置文件说明

### `wrangler.toml`

Cloudflare Pages 配置文件，包含：
- 项目名称
- 兼容性日期
- 构建输出目录
- 环境变量（可选）
- KV/D1 绑定（如果需要）

### `next.config.mjs`

Next.js 配置文件，已配置：
- Cloudflare 开发平台模拟（开发环境）
- 图片未优化（适配静态导出）
- TypeScript 错误忽略（构建时）

---

## 🌐 自定义域名

部署完成后，可以绑定自定义域名：

1. 在 Cloudflare Dashboard 中进入项目设置
2. 点击 **Custom domains**
3. 输入你的域名
4. 按照提示配置 DNS 记录

---

## 🔄 持续部署

### 自动部署

连接 Git 仓库后，Cloudflare Pages 会自动：
- 监听 `main`/`master` 分支的推送
- 自动触发构建和部署
- 为每个 Pull Request 创建预览部署

### 手动触发

在 Dashboard 中点击 **Retry deployment** 可以重新部署。

---

## 🐛 常见问题

### 1. 构建失败

**问题**：构建命令执行失败

**解决方案**：
- 检查 Node.js 版本（推荐 18+）
- 确保所有依赖已正确安装
- 查看构建日志中的错误信息

### 2. 页面空白或 404

**问题**：部署后页面无法访问

**解决方案**：
- 确认构建输出目录正确（`.vercel/output/static`）
- 检查路由配置
- 查看浏览器控制台错误

### 3. 图片无法加载

**问题**：频道 Logo 或其他图片无法显示

**解决方案**：
- 确认图片路径正确
- 检查 `next.config.mjs` 中的 `images.unoptimized` 配置
- 确保图片文件在 `public` 目录中

### 4. API 请求失败

**问题**：无法获取 IPTV 数据

**解决方案**：
- 检查 CORS 设置
- 确认 API 端点可访问
- 查看网络请求错误

---

## 📊 性能优化

### 1. 启用 Cloudflare 缓存

Cloudflare Pages 自动启用 CDN 缓存，静态资源会被缓存。

### 2. 使用 Cloudflare Workers

如果需要服务器端逻辑，可以考虑：
- Cloudflare Workers（边缘计算）
- Cloudflare Functions（Pages Functions）

### 3. 优化构建输出

- 使用 `next/image` 优化图片（如果支持）
- 启用代码分割
- 压缩静态资源

---

## 🔐 安全建议

1. **环境变量**：敏感信息使用环境变量，不要提交到代码库
2. **CORS**：如果添加 API，正确配置 CORS
3. **内容安全策略**：考虑添加 CSP 头

---

## 📚 相关资源

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [next-on-pages 文档](https://github.com/cloudflare/next-on-pages)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

---

## 🆘 获取帮助

如果遇到问题：

1. 查看 Cloudflare Dashboard 中的构建日志
2. 检查 [Cloudflare Community](https://community.cloudflare.com/)
3. 查看项目 GitHub Issues

---

## ✅ 部署检查清单

部署前确认：

- [ ] 代码已推送到 Git 仓库
- [ ] 所有依赖已安装
- [ ] 本地构建成功（`pnpm run pages:build`）
- [ ] 本地预览正常（`pnpm run pages:dev`）
- [ ] 环境变量已配置（如需要）
- [ ] 自定义域名已配置（如需要）

部署后验证：

- [ ] 网站可以访问
- [ ] 页面加载正常
- [ ] 数据可以正常获取
- [ ] 视频播放功能正常
- [ ] 移动端显示正常（如需要）

---

祝部署顺利！🎉
