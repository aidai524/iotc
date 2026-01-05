# 部署说明

## 📋 当前状态

代码已提交到本地 Git 仓库，但推送到 GitHub 时遇到认证问题。

## 🚀 部署步骤

### 步骤 1: 推送到 GitHub

由于 GitHub 需要认证，请手动执行以下命令：

```bash
cd /Users/joe/Downloads/iptv_cursor_docs

# 方式 1: 使用 GitHub CLI (推荐)
gh repo create iotc --public --source=. --remote=origin --push

# 方式 2: 使用 HTTPS (需要 Personal Access Token)
# 1. 访问 https://github.com/settings/tokens
# 2. 创建新的 Personal Access Token (classic)
# 3. 选择权限: repo
# 4. 使用 token 作为密码推送:
git push -u origin main
# 用户名: 你的 GitHub 用户名
# 密码: 你的 Personal Access Token

# 方式 3: 使用 SSH (推荐长期使用)
# 1. 生成 SSH key: ssh-keygen -t ed25519 -C "your_email@example.com"
# 2. 添加到 GitHub: https://github.com/settings/keys
# 3. 更改远程 URL:
git remote set-url origin git@github.com:aidai524/iotc.git
git push -u origin main
```

### 步骤 2: 部署到 Cloudflare Pages

#### 方式 A: 通过 Cloudflare Dashboard (推荐)

1. **访问 Cloudflare Dashboard**
   - 登录 https://dash.cloudflare.com
   - 进入 **Workers & Pages** → **Create application** → **Pages**

2. **连接 GitHub 仓库**
   - 点击 **Connect to Git**
   - 选择 GitHub 并授权
   - 选择仓库: `aidai524/iotc`
   - 选择分支: `main`

3. **配置构建设置**
   ```
   Framework preset: None (或 Next.js)
   Root directory: iptv-web-interface
   Build command: pnpm install && pnpm run build
   Build output directory: out
   ```

4. **环境变量** (可选)
   ```
   NODE_VERSION=20
   PNPM_VERSION=8
   ```

5. **保存并部署**
   - 点击 **Save and Deploy**
   - Cloudflare 会自动构建和部署

#### 方式 B: 使用 Wrangler CLI

```bash
cd iptv-web-interface

# 1. 登录 Cloudflare
npx wrangler login

# 2. 构建项目 (需要先解决构建错误)
pnpm run build

# 3. 部署
npx wrangler pages deploy out --project-name=iptv-explorer
```

## ⚠️ 当前构建问题

项目存在 TailwindCSS v4 兼容性问题，错误信息：
```
TypeError: generate is not a function
```

### 临时解决方案

**选项 1: 降级 TailwindCSS 到 v3**

```bash
cd iptv-web-interface
pnpm remove @tailwindcss/postcss tailwindcss
pnpm add -D tailwindcss@^3 postcss autoprefixer
```

然后更新 `postcss.config.mjs`:
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

更新 `app/globals.css`，将 `@import "tailwindcss";` 改为：
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**选项 2: 使用 Cloudflare Dashboard 自动构建**

Cloudflare 可能会自动处理一些构建问题，建议先尝试通过 Dashboard 部署。

## 📝 后续步骤

1. ✅ 代码已提交到本地 Git
2. ⏳ 推送到 GitHub (需要认证)
3. ⏳ 解决构建问题
4. ⏳ 部署到 Cloudflare Pages

## 🔗 相关链接

- GitHub 仓库: https://github.com/aidai524/iotc
- Cloudflare Dashboard: https://dash.cloudflare.com
- GitHub Personal Access Tokens: https://github.com/settings/tokens
