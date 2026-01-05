/**
 * IPTV 数据获取脚本
 * 从 M3U 数据源拉取频道列表，下载 logo 图片，生成本地 JSON 数据
 * 
 * 使用方法: npx tsx scripts/fetch-iptv-data.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'

// M3U 数据源
const M3U_SOURCE = "https://gh-proxy.com/raw.githubusercontent.com/suxuang/myIPTV/main/ipv4.m3u"

// 输出目录
const PUBLIC_DIR = path.join(process.cwd(), 'public')
const DATA_DIR = path.join(PUBLIC_DIR, 'data')
const LOGOS_DIR = path.join(PUBLIC_DIR, 'logos')

// 数据接口
interface M3UChannel {
  name: string
  url: string
  tvgId?: string
  tvgName?: string
  tvgLogo?: string
  groupTitle?: string
  userAgent?: string
  referer?: string
}

interface Channel {
  id: string
  name: string
  alt_names: string[]
  country: string
  categories: string[]
  logo: string  // 本地路径
  originalLogo?: string  // 原始 URL
}

interface Stream {
  channel: string
  url: string
  http_referrer: string | null
  user_agent: string | null
}

// 解析 M3U 内容
function parseM3U(content: string): M3UChannel[] {
  const lines = content.split('\n').map(line => line.trim())
  const channels: M3UChannel[] = []
  let currentChannel: Partial<M3UChannel> | null = null

  for (const line of lines) {
    if (!line || line === '#EXTM3U' || line.startsWith('#EXTM3U ')) continue

    if (line.startsWith('#EXTINF:')) {
      currentChannel = {}
      const attributes = line.substring(line.indexOf(' ') + 1)

      // 解析各种属性
      const tvgIdMatch = attributes.match(/tvg-id="([^"]*)"/)
      const tvgNameMatch = attributes.match(/tvg-name="([^"]*)"/)
      const tvgLogoMatch = attributes.match(/tvg-logo="([^"]*)"/)
      const groupTitleMatch = attributes.match(/group-title="([^"]*)"/)
      // 支持多种格式的 user-agent 和 referer
      const userAgentMatch = attributes.match(/(?:http-)?user-agent="([^"]*)"/)
      const refererMatch = attributes.match(/(?:http-)?refer+er="([^"]*)"/)

      // 提取频道名称（在最后一个逗号后面）
      const commaIndex = attributes.lastIndexOf(',')
      const channelName = commaIndex !== -1 ? attributes.substring(commaIndex + 1).trim() : ''

      currentChannel.name = channelName || tvgNameMatch?.[1] || 'Unknown'
      currentChannel.tvgId = tvgIdMatch?.[1]
      currentChannel.tvgName = tvgNameMatch?.[1]
      currentChannel.tvgLogo = tvgLogoMatch?.[1]
      currentChannel.groupTitle = groupTitleMatch?.[1]
      currentChannel.userAgent = userAgentMatch?.[1]
      currentChannel.referer = refererMatch?.[1]
    } else if (!line.startsWith('#') && currentChannel) {
      currentChannel.url = line
      channels.push(currentChannel as M3UChannel)
      currentChannel = null
    }
  }

  return channels
}

// 下载文件
function downloadFile(url: string, destPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http
    const timeout = 10000 // 10秒超时

    const request = protocol.get(url, { timeout }, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath).then(resolve)
          return
        }
      }

      if (response.statusCode !== 200) {
        resolve(false)
        return
      }

      const fileStream = fs.createWriteStream(destPath)
      response.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close()
        resolve(true)
      })

      fileStream.on('error', () => {
        fs.unlink(destPath, () => {})
        resolve(false)
      })
    })

    request.on('error', () => resolve(false))
    request.on('timeout', () => {
      request.destroy()
      resolve(false)
    })
  })
}

// 生成安全的文件名
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50)
}

// 获取文件扩展名
function getExtension(url: string): string {
  const match = url.match(/\.(png|jpg|jpeg|gif|svg|webp)/i)
  return match ? match[1].toLowerCase() : 'png'
}

// 主函数
async function main() {
  console.log('🚀 开始获取 IPTV 数据...\n')

  // 确保目录存在
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true })

  // 1. 获取 M3U 数据
  console.log('📥 正在下载 M3U 数据源...')
  const response = await fetch(M3U_SOURCE)
  if (!response.ok) {
    console.error('❌ 下载 M3U 失败:', response.statusText)
    process.exit(1)
  }
  const m3uContent = await response.text()
  console.log('✅ M3U 下载完成\n')

  // 2. 解析 M3U
  console.log('🔍 解析 M3U 数据...')
  const m3uChannels = parseM3U(m3uContent)
  console.log(`✅ 解析完成，共 ${m3uChannels.length} 个频道条目\n`)

  // 3. 合并同名频道，收集所有 logo URL
  console.log('🔗 合并同名频道...')
  const channelMap = new Map<string, { channel: Channel; streams: Stream[]; logoUrl: string }>()
  
  m3uChannels.forEach((m3u, index) => {
    const name = m3u.name.trim()
    const stream: Stream = {
      channel: '', // 后面填充
      url: m3u.url,
      http_referrer: m3u.referer || null,
      user_agent: m3u.userAgent || null,
    }

    if (!channelMap.has(name)) {
      // 生成频道 ID
      const id = `ch_${index}_${sanitizeFilename(name)}`
      
      const channel: Channel = {
        id,
        name,
        alt_names: m3u.tvgName ? [m3u.tvgName] : [],
        country: 'CN',
        categories: m3u.groupTitle ? [m3u.groupTitle] : [],
        logo: '', // 后面填充
        originalLogo: m3u.tvgLogo,
      }
      
      stream.channel = id
      channelMap.set(name, { 
        channel, 
        streams: [stream], 
        logoUrl: m3u.tvgLogo || '' 
      })
    } else {
      const existing = channelMap.get(name)!
      stream.channel = existing.channel.id
      existing.streams.push(stream)
      
      // 合并分类
      if (m3u.groupTitle && !existing.channel.categories.includes(m3u.groupTitle)) {
        existing.channel.categories.push(m3u.groupTitle)
      }
      
      // 如果没有 logo，尝试使用新的
      if (!existing.logoUrl && m3u.tvgLogo) {
        existing.logoUrl = m3u.tvgLogo
        existing.channel.originalLogo = m3u.tvgLogo
      }
      
      // 优先使用高质量 logo（gitee/github）
      if (m3u.tvgLogo && (
        m3u.tvgLogo.includes('gitee.com') || 
        m3u.tvgLogo.includes('github')
      )) {
        existing.logoUrl = m3u.tvgLogo
        existing.channel.originalLogo = m3u.tvgLogo
      }
    }
  })

  const channels = Array.from(channelMap.values()).map(v => v.channel)
  const allStreams = Array.from(channelMap.values()).flatMap(v => v.streams)
  
  console.log(`✅ 合并完成，共 ${channels.length} 个独立频道，${allStreams.length} 个流源\n`)

  // 4. 下载所有 logo
  console.log('🖼️  开始下载 Logo 图片...')
  const logoUrls = Array.from(channelMap.values())
    .filter(v => v.logoUrl)
    .map(v => ({ name: v.channel.name, url: v.logoUrl, id: v.channel.id }))
  
  console.log(`   共需下载 ${logoUrls.length} 个 Logo\n`)

  let downloadedCount = 0
  let failedCount = 0
  const batchSize = 10 // 并发数

  for (let i = 0; i < logoUrls.length; i += batchSize) {
    const batch = logoUrls.slice(i, i + batchSize)
    
    await Promise.all(batch.map(async ({ name, url, id }) => {
      const ext = getExtension(url)
      const filename = `${sanitizeFilename(name)}.${ext}`
      const destPath = path.join(LOGOS_DIR, filename)
      
      // 如果文件已存在，跳过
      if (fs.existsSync(destPath)) {
        const data = channelMap.get(name)
        if (data) data.channel.logo = `/logos/${filename}`
        downloadedCount++
        return
      }

      const success = await downloadFile(url, destPath)
      const data = channelMap.get(name)
      
      if (success && data) {
        data.channel.logo = `/logos/${filename}`
        downloadedCount++
      } else {
        failedCount++
        // 使用原始 URL 作为后备
        if (data) data.channel.logo = url
      }
    }))

    // 显示进度
    const progress = Math.min(i + batchSize, logoUrls.length)
    process.stdout.write(`\r   进度: ${progress}/${logoUrls.length} (成功: ${downloadedCount}, 失败: ${failedCount})`)
  }

  console.log('\n✅ Logo 下载完成\n')

  // 5. 生成最终数据
  const finalChannels = Array.from(channelMap.values()).map(v => {
    const { originalLogo, ...channel } = v.channel
    return channel
  })

  const finalStreams = Array.from(channelMap.values()).flatMap(v => v.streams)

  // 6. 写入 JSON 文件
  console.log('💾 保存数据文件...')
  
  fs.writeFileSync(
    path.join(DATA_DIR, 'channels.json'),
    JSON.stringify(finalChannels, null, 2),
    'utf-8'
  )
  console.log(`   ✅ channels.json (${finalChannels.length} 个频道)`)

  fs.writeFileSync(
    path.join(DATA_DIR, 'streams.json'),
    JSON.stringify(finalStreams, null, 2),
    'utf-8'
  )
  console.log(`   ✅ streams.json (${finalStreams.length} 个流源)`)

  // 生成简单的国家列表
  const countries = [
    { name: '中国', code: 'CN', languages: ['zh'], flag: '🇨🇳' }
  ]
  fs.writeFileSync(
    path.join(DATA_DIR, 'countries.json'),
    JSON.stringify(countries, null, 2),
    'utf-8'
  )
  console.log('   ✅ countries.json')

  console.log('\n🎉 数据获取完成！\n')
  console.log('📊 统计信息:')
  console.log(`   - 频道数量: ${finalChannels.length}`)
  console.log(`   - 流源数量: ${finalStreams.length}`)
  console.log(`   - Logo 成功: ${downloadedCount}`)
  console.log(`   - Logo 失败: ${failedCount}`)
}

main().catch(console.error)
