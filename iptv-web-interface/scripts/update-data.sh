#!/bin/bash

# IPTV 数据更新脚本
# 从 iptv-org GitHub API 下载最新的数据文件

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../public/data"
API_BASE="https://iptv-org.github.io/api"

echo "📥 开始更新 IPTV 数据文件..."
echo "📁 数据目录: $DATA_DIR"
echo ""

# 确保目录存在
mkdir -p "$DATA_DIR"

# 下载 countries.json
echo "⬇️  下载 countries.json..."
curl -f -o "$DATA_DIR/countries.json" "$API_BASE/countries.json"
if [ $? -eq 0 ]; then
  SIZE=$(ls -lh "$DATA_DIR/countries.json" | awk '{print $5}')
  echo "✅ countries.json 下载完成 ($SIZE)"
else
  echo "❌ countries.json 下载失败"
  exit 1
fi

# 下载 channels.json
echo "⬇️  下载 channels.json..."
curl -f -o "$DATA_DIR/channels.json" "$API_BASE/channels.json"
if [ $? -eq 0 ]; then
  SIZE=$(ls -lh "$DATA_DIR/channels.json" | awk '{print $5}')
  echo "✅ channels.json 下载完成 ($SIZE)"
else
  echo "❌ channels.json 下载失败"
  exit 1
fi

# 下载 streams.json
echo "⬇️  下载 streams.json..."
curl -f -o "$DATA_DIR/streams.json" "$API_BASE/streams.json"
if [ $? -eq 0 ]; then
  SIZE=$(ls -lh "$DATA_DIR/streams.json" | awk '{print $5}')
  echo "✅ streams.json 下载完成 ($SIZE)"
else
  echo "❌ streams.json 下载失败"
  exit 1
fi

echo ""
echo "🎉 所有数据文件更新完成！"
echo ""
echo "📊 文件大小统计:"
ls -lh "$DATA_DIR"/*.json | awk '{print "  " $9 ": " $5}'
