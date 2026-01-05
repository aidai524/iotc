# spec.md
## 功能与数据规范

## 1. 数据来源（唯一来源）

所有数据来自 **iptv-org 官方 GitHub Pages API**（静态 JSON）：

### Channels
GET https://iptv-org.github.io/api/channels.json

字段：
- id
- name
- logo
- country
- languages
- categories
- is_nsfw
- alt_names

### Streams
GET https://iptv-org.github.io/api/streams.json

字段：
- channel
- url
- resolution
- quality
- status

### Countries
GET https://iptv-org.github.io/api/countries.json

字段：
- code
- name
- flag

## 2. 数据组合逻辑

- 并行请求 channels / streams / countries
- 构建 Map<channelId, Stream[]>
- enrich channel：
  - streams
  - isPlayable

## 3. 可播放判断
isPlayable = streams.length > 0 && url 存在

## 4. 页面结构
- 左：国家导航
- 中：频道列表
- 右：Now Playing

## 5. 本地状态
- favorites
- recent
- lastCountry
