"use client"

import { memo, useMemo, useState } from "react"
import { type Channel, type Stream, hasHD, has4K, hasEPG } from "@/lib/iptv"
import { cn } from "@/lib/utils"
import { Star, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface ChannelCardProps {
  channel: Channel
  streamMap: Map<string, Stream[]>
  isSelected: boolean
  isFavorite: boolean
  onSelect: () => void
  onToggleFavorite: () => void
  onPlay: () => void
}

// 使用 memo 优化，只在 props 真正变化时重新渲染
// 自定义比较函数，忽略函数引用的变化（因为它们在父组件中是稳定的）
export const ChannelCard = memo(
  function ChannelCard({
    channel,
    streamMap,
    isSelected,
    isFavorite,
    onSelect,
    onToggleFavorite,
    onPlay,
  }: ChannelCardProps) {
  // 使用 useMemo 缓存计算结果
  const isHD = useMemo(() => hasHD(channel), [channel])
  const is4K = useMemo(() => has4K(channel), [channel])
  const hasEpg = useMemo(() => hasEPG(streamMap, channel.id), [streamMap, channel.id])
  const isPlayable = useMemo(() => streamMap.has(channel.id), [streamMap, channel.id])
  const streamCount = useMemo(() => {
    const streams = streamMap.get(channel.id)
    return streams ? streams.length : 0
  }, [streamMap, channel.id])

  const [logoError, setLogoError] = useState(false)

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300",
        "bg-white/5 border border-white/5 hover:bg-white/10",
        isSelected &&
          "scale-[1.02] bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30 shadow-xl shadow-cyan-500/10",
      )}
    >
      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
        {channel.logo && !logoError ? (
          <Image
            src={channel.logo}
            alt={channel.name}
            fill
            className="object-contain p-0.5"
            unoptimized
            loading="lazy"
            decoding="async"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 text-sm font-bold">
            {channel.name.charAt(0)}
          </div>
        )}
        {isPlayable && isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPlay()
            }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Play className="w-5 h-5 text-white fill-white" />
          </button>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3
            className={cn(
              "text-sm font-semibold truncate transition-colors flex-1 min-w-0",
              isSelected ? "text-white" : "text-white/80",
            )}
          >
            {channel.name}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite()
            }}
            className="flex-shrink-0 p-1.5 rounded-md hover:bg-white/10 transition-all active:scale-95 z-10"
            title={isFavorite ? "取消收藏" : "收藏"}
          >
            <Star
              className={cn(
                "w-4 h-4 transition-all",
                isFavorite
                  ? "text-yellow-400 fill-yellow-400 scale-110"
                  : "text-white/50 hover:text-yellow-400 hover:scale-110",
              )}
            />
          </button>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {isPlayable && (
            <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-[9px] px-1.5 py-0 border-0 h-4">
              直播
            </Badge>
          )}
          {streamCount > 0 && (
            <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400 text-[9px] px-1.5 py-0 border-0 h-4">
              {streamCount} 流
            </Badge>
          )}
          {isHD && (
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-[9px] px-1.5 py-0 border-0 h-4">
              HD
            </Badge>
          )}
          {is4K && (
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-[9px] px-1.5 py-0 border-0 h-4">
              4K
            </Badge>
          )}
          {hasEpg && (
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0 border-0 h-4">
              EPG
            </Badge>
          )}
        </div>
      </div>

      {isSelected && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-l-full" />
      )}
    </div>
  )
  },
  // 自定义比较函数：只比较关键 props，忽略函数引用
  (prevProps, nextProps) => {
    return (
      prevProps.channel.id === nextProps.channel.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isFavorite === nextProps.isFavorite &&
      prevProps.streamMap === nextProps.streamMap &&
      prevProps.channel.name === nextProps.channel.name &&
      prevProps.channel.logo === nextProps.channel.logo
    )
  },
)
