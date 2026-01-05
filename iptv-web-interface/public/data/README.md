# IPTV 数据文件

此目录包含从 iptv-org GitHub API 下载的静态 JSON 数据文件。

## 文件说明

- `countries.json` - 国家列表数据
- `channels.json` - 频道列表数据（约 9MB）
- `streams.json` - 流数据（约 2.8MB）

## 更新数据

### 方法 1：使用更新脚本（推荐）

在项目根目录运行：

```bash
pnpm run update-data
```

或直接运行脚本：

```bash
bash scripts/update-data.sh
```

### 方法 2：手动下载

如果需要手动更新数据，可以运行以下命令：

```bash
cd public/data
curl -o countries.json https://iptv-org.github.io/api/countries.json
curl -o channels.json https://iptv-org.github.io/api/channels.json
curl -o streams.json https://iptv-org.github.io/api/streams.json
```

## 注意事项

- 这些文件会随项目一起部署
- 文件较大，但可以显著提升页面加载速度
- 建议定期更新以获取最新的频道和流数据
