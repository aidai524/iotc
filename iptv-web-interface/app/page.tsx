"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import useSWR from "swr"
import {
  fetchChannels,
  fetchStreams,
  buildStreamMap,
  type Channel,
  type Stream,
} from "@/lib/iptv"
import { ChannelList } from "@/components/channel-list"
import { NowPlayingPanel } from "@/components/now-playing-panel"
import { validateStreams } from "@/lib/stream-validator"

// localStorage 键名
const FAVORITES_STORAGE_KEY = "iptv-favorites"

// 从 localStorage 读取收藏数据
function loadFavoritesFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set()
  
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (stored) {
      const favoritesArray = JSON.parse(stored) as string[]
      return new Set(favoritesArray)
    }
  } catch (error) {
    console.error("Failed to load favorites from localStorage:", error)
  }
  
  return new Set()
}

// 保存收藏数据到 localStorage
function saveFavoritesToStorage(favorites: Set<string>): void {
  if (typeof window === "undefined") return
  
  try {
    const favoritesArray = Array.from(favorites)
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoritesArray))
  } catch (error) {
    console.error("Failed to save favorites to localStorage:", error)
  }
}

export default function Home() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [playingChannel, setPlayingChannel] = useState<Channel | null>(null)
  const [playingStream, setPlayingStream] = useState<Stream | null>(null)
  const [playingStreams, setPlayingStreams] = useState<Stream[]>([])
  // 从 localStorage 初始化收藏数据
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavoritesFromStorage())
  const [showFavorites, setShowFavorites] = useState(false)
  // 可播放频道测试相关状态
  const [playableChannels, setPlayableChannels] = useState<Set<string> | null>(null)
  const [isTestingPlayable, setIsTestingPlayable] = useState(false)
  const [testProgress, setTestProgress] = useState({ completed: 0, total: 0 })

  // 优化 SWR 配置：禁用重新验证，数据从本地文件加载不需要频繁更新
  const swrConfig = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 60000, // 1分钟内去重
  }

  const { data: channels, isLoading: loadingChannels } = useSWR<Channel[]>(
    "channels",
    fetchChannels,
    swrConfig,
  )
  const { data: streams, isLoading: loadingStreams } = useSWR<Stream[]>("streams", fetchStreams, swrConfig)

  // 构建频道 ID 集合，用于过滤流数据
  const channelIds = useMemo(() => {
    if (!channels) return new Set<string>()
    return new Set(channels.map((ch) => ch.id))
  }, [channels])

  const streamMap = useMemo(() => {
    if (!streams) return new Map<string, Stream[]>()
    return buildStreamMap(streams, channelIds)
  }, [streams, channelIds])

  // 过滤后的频道列表（只显示收藏或全部中国频道，且必须有流地址）
  const filteredChannels = useMemo(() => {
    if (!channels) return []
    let result = channels
    
    // 过滤：只保留有流地址的频道
    result = result.filter((ch) => {
      const channelStreams = streamMap.get(ch.id)
      return channelStreams && channelStreams.length > 0
    })
    
    // 如果只显示可播放的频道（测试后）
    if (playableChannels !== null) {
      result = result.filter((ch) => playableChannels.has(ch.id))
    }
    
    // 如果显示收藏，进一步过滤
    if (showFavorites) {
      result = result.filter((ch) => favorites.has(ch.id))
    }
    
    return result
  }, [channels, showFavorites, favorites, streamMap, playableChannels])

  // 当从收藏列表切换回正常列表时，清除选中的频道和播放状态
  useEffect(() => {
    if (!showFavorites) {
      setSelectedChannel(null)
      setPlayingChannel(null)
      setPlayingStream(null)
      setPlayingStreams([])
    }
  }, [showFavorites])

  // 当收藏数据变化时，保存到 localStorage
  useEffect(() => {
    saveFavoritesToStorage(favorites)
  }, [favorites])

  // 使用 useCallback 优化事件处理函数，避免每次渲染创建新函数
  const handleToggleFavorites = useCallback(() => {
    setShowFavorites((prev) => !prev)
  }, [])

  const handleSelectChannel = useCallback(
    (channel: Channel) => {
      setSelectedChannel(channel)
      // 如果频道可播放，自动开始播放
      const channelStreams = streamMap.get(channel.id)
      if (channelStreams && channelStreams.length > 0) {
        setPlayingChannel(channel)
        setPlayingStream(channelStreams[0])
        setPlayingStreams(channelStreams)
      }
    },
    [streamMap],
  )

  const handleToggleFavorite = useCallback((channelId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(channelId)) {
        next.delete(channelId)
      } else {
        next.add(channelId)
      }
      return next
    })
  }, [])

  const handlePlay = useCallback(
    (channel: Channel) => {
      const channelStreams = streamMap.get(channel.id)
      if (channelStreams && channelStreams.length > 0) {
        setPlayingChannel(channel)
        setPlayingStream(channelStreams[0])
        // 传递所有流源给播放面板，以便尝试多个流
        setPlayingStreams(channelStreams)
      }
    },
    [streamMap],
  )

  // 测试可播放频道（测试多个流源）
  const handleTestPlayableChannels = useCallback(async () => {
    if (!channels || !streamMap) return

    setIsTestingPlayable(true)
    setTestProgress({ completed: 0, total: 0 })
    // 清空列表：测试开始时清除所有数据
    setPlayableChannels(new Set<string>())

    try {
      // 构建需要测试的频道列表（只包含有流地址的频道）
      const channelsToTest = channels.filter((ch) => {
        const channelStreams = streamMap.get(ch.id)
        return channelStreams && channelStreams.length > 0
      })

      // 构建每个频道的所有流源映射
      const streamsPerChannel = new Map<
        string,
        Array<{ url: string; userAgent?: string | null; httpReferrer?: string | null }>
      >()

      // 构建单个流列表（用于兼容性，如果频道只有一个流源）
      const singleStreams: Array<{
        url: string
        channelId: string
        channelName: string
        userAgent?: string | null
        httpReferrer?: string | null
      }> = []

      for (const channel of channelsToTest) {
        const channelStreams = streamMap.get(channel.id)!
        
        // 如果频道有多个流源，添加到多流源映射中
        if (channelStreams.length > 1) {
          streamsPerChannel.set(
            channel.id,
            channelStreams.map((stream) => ({
              url: stream.url,
              userAgent: stream.user_agent || null,
              httpReferrer: stream.http_referrer || null,
            })),
          )
        } else {
          // 单个流源，添加到单流列表
          singleStreams.push({
            url: channelStreams[0].url,
            channelId: channel.id,
            channelName: channel.name,
            userAgent: channelStreams[0].user_agent || null,
            httpReferrer: channelStreams[0].http_referrer || null,
          })
        }
      }

      setTestProgress({ completed: 0, total: channelsToTest.length })

      // 执行测试：分别测试多流源频道和单流源频道
      let allResults: Array<{
        url: string
        channelId: string
        channelName: string
        userAgent?: string | null
        httpReferrer?: string | null
      }> = []

      // 为多流源频道创建测试数据
      for (const [channelId, streams] of streamsPerChannel.entries()) {
        const channel = channelsToTest.find((ch) => ch.id === channelId)
        if (channel) {
          // 为每个流源创建测试项
          streams.forEach((stream) => {
            allResults.push({
              url: stream.url,
              channelId,
              channelName: channel.name,
              userAgent: stream.userAgent || null,
              httpReferrer: stream.httpReferrer || null,
            })
          })
        }
      }

      // 添加单流源频道
      allResults.push(...singleStreams)

      // 用于跟踪已完成的频道
      const completedChannelsSet = new Set<string>()

      // 用于实时跟踪已测试成功的频道
      const playableIdsSet = new Set<string>()

      // 执行测试（测试多个流源）
      const results = await validateStreams(allResults, {
        concurrency: 4, // 降低并发数，因为每个频道可能测试多个流源
        timeout: 12000, // 12秒超时（视频加载需要更长时间）
        onProgress: (completed, total) => {
          // 注意：这里的 completed 是流源数，不是频道数
          // 我们需要根据结果计算已完成的频道数
          // 但由于是异步的，我们使用一个近似值
          const estimatedChannels = Math.min(
            Math.floor((completed / Math.max(total / channelsToTest.length, 1))),
            channelsToTest.length,
          )
          setTestProgress({ completed: estimatedChannels, total: channelsToTest.length })
        },
        onChannelSuccess: (channelId) => {
          // 实时添加成功的频道到列表
          if (!playableIdsSet.has(channelId)) {
            playableIdsSet.add(channelId)
            // 实时更新状态，触发列表更新
            setPlayableChannels(new Set(playableIdsSet))
            // 更新进度
            setTestProgress({ completed: playableIdsSet.size, total: channelsToTest.length })
          }
        },
        testMultipleStreams: streamsPerChannel.size > 0,
        streamsPerChannel: streamsPerChannel.size > 0 ? streamsPerChannel : undefined,
      })

      // 最终确认：提取所有可播放的频道ID（只要有一个流源成功就认为可播放）
      const finalPlayableIds = new Set(
        results.filter((r) => r.status === "success").map((r) => r.channelId),
      )

      // 设置最终结果
      setPlayableChannels(finalPlayableIds)
      setTestProgress({ completed: finalPlayableIds.size, total: channelsToTest.length })
    } catch (error) {
      console.error("Failed to test playable channels:", error)
    } finally {
      setIsTestingPlayable(false)
    }
  }, [channels, streamMap])

  // 恢复默认列表（显示所有有流的频道）
  const handleResetPlayableFilter = useCallback(() => {
    setPlayableChannels(null)
    setTestProgress({ completed: 0, total: 0 })
  }, [])

  const isLoading = loadingChannels || loadingStreams

  return (
    <main className="h-screen w-screen overflow-hidden flex bg-background">
      <ChannelList
        channels={filteredChannels}
        streamMap={streamMap}
        selectedChannelId={selectedChannel?.id || null}
        favorites={favorites}
        onSelectChannel={handleSelectChannel}
        onToggleFavorite={handleToggleFavorite}
        onPlay={handlePlay}
        loading={isLoading}
        countryName="中国"
        showFavorites={showFavorites}
        onToggleFavorites={handleToggleFavorites}
        favoritesCount={favorites.size}
        showPlayableOnly={playableChannels !== null}
        isTestingPlayable={isTestingPlayable}
        testProgress={testProgress}
        onTestPlayableChannels={handleTestPlayableChannels}
        onResetPlayableFilter={handleResetPlayableFilter}
      />
      <NowPlayingPanel 
        channel={playingChannel} 
        stream={playingStream} 
        streams={playingStreams}
      />
    </main>
  )
}
