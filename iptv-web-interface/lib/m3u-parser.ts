/**
 * M3U 播放列表解析器
 * 解析 IPTV M3U 格式文件
 */

export interface M3UChannel {
  name: string
  url: string
  tvgId?: string
  tvgName?: string
  tvgLogo?: string
  groupTitle?: string
  userAgent?: string
  referer?: string
  country?: string
  language?: string
}

/**
 * 解析 M3U 文件内容
 */
export function parseM3U(content: string): M3UChannel[] {
  const lines = content.split("\n").map((line) => line.trim())
  const channels: M3UChannel[] = []
  let currentChannel: Partial<M3UChannel> | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 跳过空行和文件头
    if (!line || line === "#EXTM3U") continue

    // 解析 #EXTINF 行
    if (line.startsWith("#EXTINF:")) {
      currentChannel = {}

      // 解析 #EXTINF:-1 tvg-id="..." tvg-name="..." tvg-logo="..." group-title="..." ,Channel Name
      const extinfMatch = line.match(/#EXTINF:(-?\d+)\s*(.*)/)
      if (extinfMatch) {
        const attributes = extinfMatch[2]

        // 解析属性
        const tvgIdMatch = attributes.match(/tvg-id="([^"]*)"/)
        const tvgNameMatch = attributes.match(/tvg-name="([^"]*)"/)
        const tvgLogoMatch = attributes.match(/tvg-logo="([^"]*)"/)
        const groupTitleMatch = attributes.match(/group-title="([^"]*)"/)
        const userAgentMatch = attributes.match(/user-agent="([^"]*)"/)
        const refererMatch = attributes.match(/referer="([^"]*)"/)
        const countryMatch = attributes.match(/country="([^"]*)"/)
        const languageMatch = attributes.match(/language="([^"]*)"/)

        // 提取频道名称（在逗号后面）
        const commaIndex = attributes.lastIndexOf(",")
        const channelName = commaIndex !== -1 ? attributes.substring(commaIndex + 1).trim() : ""

        currentChannel.name = channelName || tvgNameMatch?.[1] || "Unknown"
        currentChannel.tvgId = tvgIdMatch?.[1]
        currentChannel.tvgName = tvgNameMatch?.[1]
        currentChannel.tvgLogo = tvgLogoMatch?.[1]
        currentChannel.groupTitle = groupTitleMatch?.[1]
        currentChannel.userAgent = userAgentMatch?.[1]
        currentChannel.referer = refererMatch?.[1]
        currentChannel.country = countryMatch?.[1]
        currentChannel.language = languageMatch?.[1]
      }
    } else if (line.startsWith("#")) {
      // 跳过其他注释行
      continue
    } else if (line && currentChannel) {
      // 这是流地址
      currentChannel.url = line
      channels.push(currentChannel as M3UChannel)
      currentChannel = null
    }
  }

  return channels
}

/**
 * 从 URL 获取 M3U 文件并解析
 */
export async function fetchM3U(url: string): Promise<M3UChannel[]> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch M3U: ${response.status} ${response.statusText}`)
    }
    const content = await response.text()
    return parseM3U(content)
  } catch (error) {
    console.error("Error fetching M3U:", error)
    throw error
  }
}

/**
 * 将 M3U 频道转换为 Channel 格式
 */
export function m3uToChannel(m3uChannel: M3UChannel, index: number): {
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
} {
  // 生成唯一 ID（使用 tvg-id + 索引，或基于名称和索引和 URL hash）
  let id: string
  if (m3uChannel.tvgId) {
    // 如果有 tvg-id，使用它加上索引确保唯一性
    const urlHash = m3uChannel.url
      .split("")
      .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
      .toString(36)
    id = `${m3uChannel.tvgId}_${index}_${urlHash}`
  } else {
    // 基于名称、索引和 URL hash 生成唯一 ID
    const nameHash = m3uChannel.name.replace(/\s+/g, "_").substring(0, 20)
    const urlHash = m3uChannel.url
      .split("")
      .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
      .toString(36)
      .substring(0, 8)
    id = `m3u_${index}_${nameHash}_${urlHash}`
  }

  // 从 group-title 提取分类
  const categories = m3uChannel.groupTitle ? [m3uChannel.groupTitle] : []

  return {
    id,
    name: m3uChannel.name,
    alt_names: m3uChannel.tvgName ? [m3uChannel.tvgName] : [],
    network: null,
    owners: [],
    country: m3uChannel.country || "CN",
    subdivision: null,
    city: null,
    broadcast_area: [],
    languages: m3uChannel.language ? [m3uChannel.language] : [],
    categories,
    is_nsfw: false,
    launched: null,
    closed: null,
    replaced_by: null,
    website: null,
    logo: m3uChannel.tvgLogo || "",
  }
}

/**
 * 将 M3U 频道转换为 Stream 格式
 */
export function m3uToStream(m3uChannel: M3UChannel, channelId: string): {
  channel: string
  url: string
  http_referrer: string | null
  user_agent: string | null
} {
  return {
    channel: channelId,
    url: m3uChannel.url,
    http_referrer: m3uChannel.referer || null,
    user_agent: m3uChannel.userAgent || null,
  }
}
