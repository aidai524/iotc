# IPTV Explorer - Web / TV Style

## 📋 项目概述

基于 **iptv-org** 开源数据的 IPTV 浏览与播放网站，提供无需注册、即开即用的全球 IPTV 频道浏览体验。

### 核心特性

- 🌍 **全球频道浏览**：快速浏览全球 IPTV 频道
- 📺 **TV 风格界面**：面向大屏/TV/桌面横屏使用场景
- ⚡ **即开即用**：无需注册，直接使用
- ⭐ **收藏功能**：收藏喜欢的频道
- 🎬 **实时播放**：HTML5 视频播放支持
- 🔗 **URL 复制**：播放失败时可复制流地址

### 核心体验流程

**国家 → 频道 → 播放**，保持连续流畅的浏览体验

---

## 🎯 项目目标

### ✅ 目标功能

- [x] 快速浏览全球 IPTV 频道
- [x] 明确区分"可播放 / 不可播放"
- [x] 保持"正在播放"的连续感（TV 心智）
- [x] 前端纯实现，不引入私有数据源
- [x] 收藏功能
- [x] 国家筛选
- [x] HTML5 视频播放
- [x] 播放错误处理与 URL 复制

### ❌ 非目标（明确不做）

- 不提供付费 IPTV
- 不托管或转发流量
- 不提供账号系统
- 不保证所有流都可在浏览器播放

---

## 🛠 技术栈

- **框架**：Next.js 14 (App Router)
- **语言**：TypeScript
- **样式**：TailwindCSS
- **UI 组件**：shadcn/ui
- **数据获取**：SWR
- **播放器**：HTML5 Video

---

## 📊 数据来源

数据来自 **iptv-org 官方 GitHub Pages API**，但已下载到本地以提升性能：

### 本地数据文件

数据文件已保存在 `public/data/` 目录：
- **Channels**: `/data/channels.json` (~9MB)
- **Streams**: `/data/streams.json` (~2.8MB)
- **Countries**: `/data/countries.json` (~19KB)

### 数据更新

如需更新数据，运行：
```bash
cd public/data
curl -o countries.json https://iptv-org.github.io/api/countries.json
curl -o channels.json https://iptv-org.github.io/api/channels.json
curl -o streams.json https://iptv-org.github.io/api/streams.json
```

### 数据组合逻辑

1. 并行请求 `channels` / `streams` / `countries`（从本地文件）
2. 构建 `Map<channelId, Stream[]>`
3. 为每个 channel 添加：
   - `streams`: 关联的流列表
   - `isPlayable`: 是否可播放（`streams.length > 0 && url 存在`）

### 性能优化

- ✅ 使用本地文件，避免网络延迟
- ✅ 数据随项目一起部署，CDN 加速
- ✅ 减少外部 API 依赖

---

## 🏗 项目结构

```
iptv-web-interface/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 主页面（三栏布局）
│   ├── layout.tsx         # 根布局
│   └── globals.css        # 全局样式
├── components/             # React 组件
│   ├── country-sidebar.tsx    # 左侧：国家导航
│   ├── channel-list.tsx       # 中间：频道列表
│   ├── channel-card.tsx       # 频道卡片
│   ├── now-playing-panel.tsx  # 右侧：播放面板
│   └── ui/                    # shadcn/ui 组件
├── lib/
│   ├── iptv.ts            # IPTV 数据获取与处理逻辑
│   └── utils.ts           # 工具函数
└── hooks/                 # React Hooks
```

---

## 🎨 页面布局

```
┌─────────────┬──────────────┬─────────────────────┐
│             │              │                     │
│  国家导航    │   频道列表    │    Now Playing      │
│  (左侧)      │   (中间)      │      (右侧)         │
│             │              │                     │
│ • Favorites │ • Channel 1  │  [Video Player]     │
│ • US 🇺🇸    │ • Channel 2  │                     │
│ • UK 🇬🇧    │ • Channel 3  │  Controls           │
│ • ...       │ • ...        │                     │
└─────────────┴──────────────┴─────────────────────┘
```

---

## 📝 功能说明

### 1. 国家导航（左侧）

- 显示所有有频道的国家
- 按频道数量排序
- 显示每个国家的频道数量
- 支持收藏列表切换

### 2. 频道列表（中间）

- 显示选中国家的所有频道
- 显示频道 Logo、名称、标签（HD/4K/EPG）
- 区分可播放/不可播放状态
- 支持收藏/取消收藏
- 点击播放按钮开始播放

### 3. 播放面板（右侧）

- 显示当前播放的频道信息
- HTML5 视频播放器
- 播放/暂停/静音控制
- 播放失败时显示错误提示
- 支持复制流 URL

---

## 🚀 本地状态管理

当前实现的状态：

- ✅ `favorites`: 收藏的频道 ID 集合（Set<string>）
- ⚠️ `recent`: 最近观看（待实现，需 localStorage）
- ⚠️ `lastCountry`: 上次选择的国家（待实现，需 localStorage）

**注意**：当前收藏功能仅在内存中，刷新页面后会丢失。需要添加 localStorage 持久化。

---

## 🎬 播放策略

1. **HTML5 Video**：优先使用浏览器原生播放器
2. **Error Fallback**：播放失败时显示错误提示
3. **Copy URL**：提供复制流地址功能，用户可在其他播放器中使用

### 已知限制

- **CORS 限制**：部分流可能因跨域问题无法播放
- **编解码器**：浏览器可能不支持某些视频格式
- **数据完整性**：部分频道可能没有可用的流

---

## 🚦 运行项目

### 安装依赖

```bash
cd iptv-web-interface
pnpm install
```

### 开发模式

```bash
pnpm dev
```

访问 `http://localhost:3000`

### 构建生产版本

```bash
# 标准 Next.js 构建
pnpm build
pnpm start

# Cloudflare Pages 构建
pnpm run pages:build
pnpm run pages:dev  # 本地预览
```

---

## ☁️ Cloudflare Pages 部署

项目已配置支持 Cloudflare Pages 部署。

### 快速部署

1. **通过 Dashboard**（推荐）：
   - 连接 Git 仓库到 Cloudflare Pages
   - 构建命令：`pnpm run pages:build`
   - 输出目录：`.vercel/output/static`

2. **通过 CLI**：
   ```bash
   pnpm run pages:deploy
   ```

详细部署指南请查看 [`iptv-web-interface/DEPLOY.md`](./iptv-web-interface/DEPLOY.md)

---

## 📋 待实现功能

根据 `spec.md`，以下功能待完善：

1. **本地存储持久化**
   - [ ] favorites 保存到 localStorage
   - [ ] recent 最近观看记录
   - [ ] lastCountry 记住上次选择的国家

2. **播放体验优化**
   - [ ] 多流源切换（当频道有多个流时）
   - [ ] 播放质量选择
   - [ ] 播放历史记录

3. **UI/UX 优化**
   - [ ] 键盘导航支持（TV 场景）
   - [ ] 响应式布局优化
   - [ ] 加载状态优化

---

## 🔍 代码说明

### 核心文件

- **`lib/iptv.ts`**: 数据获取和处理的核心逻辑
  - `fetchCountries()`: 获取国家列表
  - `fetchChannels()`: 获取频道列表
  - `fetchStreams()`: 获取流列表
  - `buildStreamMap()`: 构建频道到流的映射
  - `getChannelsByCountry()`: 按国家筛选频道

- **`app/page.tsx`**: 主页面，管理全局状态和布局

- **`components/now-playing-panel.tsx`**: 播放面板，处理视频播放逻辑

---

## ⚠️ 风险与限制

1. **CORS / 编解码器**：部分流无法在浏览器中播放
2. **数据不完整**：部分频道可能没有可用流
3. **网络依赖**：依赖 iptv-org API 的可用性
4. **播放稳定性**：流地址可能随时失效

---

## 📄 文档结构

项目需求文档分为三个部分：

- **`intent.md`**: 项目背景和目标
- **`plan.md`**: 技术实现方案
- **`spec.md`**: 功能与数据规范

---

## 📝 开发建议

1. **遵循现有代码风格**：使用 TypeScript、TailwindCSS、shadcn/ui
2. **保持 TV 风格**：界面设计面向大屏横屏场景
3. **错误处理**：优雅处理播放失败和数据加载失败
4. **性能优化**：使用 SWR 缓存，避免重复请求
5. **用户体验**：保持"国家 → 频道 → 播放"的流畅流程

---

## 🤝 贡献

这是一个个人项目，欢迎提出建议和改进！

---

## 📜 许可证

本项目使用开源数据源，遵循 iptv-org 的数据使用条款。
