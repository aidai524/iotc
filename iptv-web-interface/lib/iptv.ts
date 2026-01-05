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
  country: string
  categories: string[]
  logo: string
}

export interface Stream {
  channel: string
  url: string
  http_referrer: string | null
  user_agent: string | null
}

// 数据文件路径（构建时生成的静态 JSON 文件）
const DATA_BASE_PATH = "/data"

/**
 * 获取国家列表
 */
export async function fetchCountries(): Promise<Country[]> {
  try {
    const response = await fetch(`${DATA_BASE_PATH}/countries.json`)
    if (!response.ok) throw new Error("Failed to fetch countries")
    return await response.json()
  } catch (error) {
    console.error("Error fetching countries:", error)
    // 返回默认值
    return [{ name: "中国", code: "CN", languages: ["zh"], flag: "🇨🇳" }]
  }
}

/**
 * 获取频道列表
 */
export async function fetchChannels(): Promise<Channel[]> {
  try {
    const response = await fetch(`${DATA_BASE_PATH}/channels.json`)
    if (!response.ok) throw new Error("Failed to fetch channels")
    return await response.json()
  } catch (error) {
    console.error("Error fetching channels:", error)
    return []
  }
}

/**
 * 获取流源列表
 */
export async function fetchStreams(): Promise<Stream[]> {
  try {
    const response = await fetch(`${DATA_BASE_PATH}/streams.json`)
    if (!response.ok) throw new Error("Failed to fetch streams")
    return await response.json()
  } catch (error) {
    console.error("Error fetching streams:", error)
    return []
  }
}

/**
 * 构建频道 ID 到流源列表的映射
 */
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

/**
 * 按国家代码过滤频道
 */
export function getChannelsByCountry(channels: Channel[], countryCode: string): Channel[] {
  return channels.filter((ch) => ch.country.toLowerCase() === countryCode.toLowerCase())
}

/**
 * 生成随机观看人数（用于 UI 展示）
 */
export function generateFakeViewCount(): number {
  return Math.floor(Math.random() * 50000) + 100
}

/**
 * 检查频道是否为 HD
 */
export function hasHD(channel: Channel): boolean {
  const name = channel.name.toLowerCase()
  return name.includes("hd") || name.includes("高清")
}

/**
 * 检查频道是否为 4K
 */
export function has4K(channel: Channel): boolean {
  const name = channel.name.toLowerCase()
  return name.includes("4k") || name.includes("超清")
}

/**
 * 检查频道是否有 EPG（节目单）
 */
export function hasEPG(streamMap: Map<string, Stream[]>, channelId: string): boolean {
  return streamMap.has(channelId)
}
