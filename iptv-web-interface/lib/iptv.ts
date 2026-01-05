export interface Country {
  name: string
  code: string
  languages: string[]
  flag: string
}

export interface Channel {
  id: string
  name: string
  alt_names: string[]
  network: string | null
  owners: string[]
  country: string
  subdivision: string | null
  city: string | null
  broadcast_area: string[]
  languages: string[]
  categories: string[]
  is_nsfw: boolean
  launched: string | null
  closed: string | null
  replaced_by: string | null
  website: string | null
  logo: string
}

export interface Stream {
  channel: string
  url: string
  http_referrer: string | null
  user_agent: string | null
}

// 使用 M3U 数据源
const M3U_SOURCE = "https://gh-proxy.com/raw.githubusercontent.com/suxuang/myIPTV/main/ipv4.m3u"

import { fetchM3U, m3uToChannel, m3uToStream } from "./m3u-parser"

// 缓存 M3U 数据
let cachedM3UData: { channels: Channel[]; streams: Stream[] } | null = null

export async function fetchCountries(): Promise<Country[]> {
  // 从 M3U 数据生成国家列表（简化实现）
  // 可以根据实际需求扩展
  return [
    {
      name: "中国",
      code: "CN",
      languages: ["zh"],
      flag: "🇨🇳",
    },
  ]
}

export async function fetchChannels(): Promise<Channel[]> {
  // 如果已有缓存，直接返回
  if (cachedM3UData) {
    return cachedM3UData.channels
  }

  try {
    // 获取 M3U 数据
    const m3uChannels = await fetchM3U(M3U_SOURCE)

    // 转换为 Channel 格式
    const channels: Channel[] = m3uChannels.map((m3uChannel, index) =>
      m3uToChannel(m3uChannel, index),
    )

    // 按频道名称合并：相同名称的频道合并为一个，保留最佳信息
    const channelsByName = new Map<string, Channel>()
    channels.forEach((channel) => {
      const normalizedName = channel.name.trim()
      if (!channelsByName.has(normalizedName)) {
        // 第一个出现的频道，使用它的信息
        channelsByName.set(normalizedName, channel)
      } else {
        // 如果已存在同名频道，合并信息
        const existing = channelsByName.get(normalizedName)!
        
        // 合并分类信息
        const existingCategories = new Set(existing.categories)
        channel.categories.forEach((cat) => existingCategories.add(cat))
        existing.categories = Array.from(existingCategories)
        
        // 合并 alt_names
        const existingAltNames = new Set(existing.alt_names)
        channel.alt_names.forEach((name) => existingAltNames.add(name))
        existing.alt_names = Array.from(existingAltNames)
        
        // 如果现有频道没有 logo 但新频道有，使用新频道的 logo
        if (!existing.logo && channel.logo) {
          existing.logo = channel.logo
        }
        
        // 优先使用更高质量的 logo（如 gitee/github 上的）
        if (channel.logo && (
          channel.logo.includes('gitee.com') || 
          channel.logo.includes('github.com') ||
          channel.logo.includes('githubusercontent.com')
        )) {
          // 如果新 logo 来自可靠源，优先使用
          if (!existing.logo.includes('gitee.com') && 
              !existing.logo.includes('github.com') &&
              !existing.logo.includes('githubusercontent.com')) {
            existing.logo = channel.logo
          }
        }
      }
    })
    const mergedChannels = Array.from(channelsByName.values())

    // 过滤中国的频道（根据 group-title 或频道名称判断）
    const cnChannels = mergedChannels.filter((ch) => {
      // 如果明确指定了国家
      if (ch.country && ch.country.toLowerCase() === "cn") {
        return true
      }
      // 如果 group-title 包含中文或中国相关关键词
      const groupTitle = ch.categories[0]?.toLowerCase() || ""
      if (
        groupTitle.includes("中国") ||
        groupTitle.includes("china") ||
        groupTitle.includes("cn") ||
        ch.name.includes("CCTV") ||
        ch.name.includes("卫视") ||
        ch.name.includes("地方台")
      ) {
        return true
      }
      // 默认包含所有频道（如果数据源主要是中国的）
      return true
    })

    // 缓存数据
    cachedM3UData = {
      channels: cnChannels,
      streams: [], // streams 会在 fetchStreams 中生成
    }

    return cnChannels
  } catch (error) {
    console.error("Failed to fetch M3U channels:", error)
    throw error
  }
}

export async function fetchStreams(): Promise<Stream[]> {
  // 如果已有缓存，直接返回
  if (cachedM3UData && cachedM3UData.streams.length > 0) {
    return cachedM3UData.streams
  }

  try {
    // 确保频道数据已加载
    const channels = await fetchChannels()
    // 创建频道名称到频道 ID 的映射（因为合并后名称唯一）
    const channelNameToId = new Map<string, string>()
    channels.forEach((ch) => {
      channelNameToId.set(ch.name.trim(), ch.id)
    })

    // 获取 M3U 数据
    const m3uChannels = await fetchM3U(M3U_SOURCE)

    // 转换为 Stream 格式，按频道名称匹配到合并后的频道 ID
    const streams: Stream[] = []
    m3uChannels.forEach((m3uChannel) => {
      const channelName = m3uChannel.name.trim()
      // 查找合并后的频道 ID
      const channelId = channelNameToId.get(channelName)
      if (channelId) {
        // 只包含已过滤的中国频道
        const stream = m3uToStream(m3uChannel, channelId)
        streams.push(stream)
      }
    })

    // 更新缓存
    if (cachedM3UData) {
      cachedM3UData.streams = streams
    } else {
      cachedM3UData = {
        channels,
        streams,
      }
    }

    return streams
  } catch (error) {
    console.error("Failed to fetch M3U streams:", error)
    throw error
  }
}

// 清除缓存（用于刷新数据）
export function clearM3UCache() {
  cachedM3UData = null
}

export function buildStreamMap(streams: Stream[], channelIds?: Set<string>): Map<string, Stream[]> {
  const map = new Map<string, Stream[]>()
  for (const stream of streams) {
    // 如果提供了 channelIds，只包含这些频道的流
    if (channelIds && !channelIds.has(stream.channel)) {
      continue
    }
    const existing = map.get(stream.channel) || []
    existing.push(stream)
    map.set(stream.channel, existing)
  }
  return map
}

export function getChannelsByCountry(channels: Channel[], countryCode: string): Channel[] {
  return channels.filter((ch) => ch.country.toLowerCase() === countryCode.toLowerCase())
}

export function generateFakeViewCount(): number {
  return Math.floor(Math.random() * 50000) + 100
}

export function hasHD(channel: Channel): boolean {
  return channel.name.toLowerCase().includes("hd") || Math.random() > 0.5
}

export function has4K(channel: Channel): boolean {
  return channel.name.toLowerCase().includes("4k") || Math.random() > 0.85
}

export function hasEPG(streamMap: Map<string, Stream[]>, channelId: string): boolean {
  return streamMap.has(channelId)
}
