"use client"

import { memo, useMemo, useState } from "react"
import { type Channel, type Stream, hasHD, has4K, hasEPG } from "@/lib/iptv"
import { cn } from "@/lib/utils"
import { Star, Play, Radio, Layers, Sparkles } from "lucide-react"
import Image from "next/image"

interface ChannelCardProps {
  channel: Channel
  streamMap: Map<string, Stream[]>
  isSelected: boolean
  isFavorite: boolean
  onSelect: () => void
  onToggleFavorite: () => void
  onPlay: () => void
  index?: number // 用于交错动画
}

// 使用 memo 优化，只在 props 真正变化时重新渲染
export const ChannelCard = memo(
  function ChannelCard({
    channel,
    streamMap,
    isSelected,
    isFavorite,
    onSelect,
    onToggleFavorite,
    onPlay,
    index = 0,
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
    const [isHovered, setIsHovered] = useState(false)

    return (
      <div
        onClick={onSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer",
          "transition-all duration-300 ease-out",
          "border border-transparent",
          // 默认状态
          "bg-card/50 hover:bg-card-hover dark:bg-card/30 dark:hover:bg-card/50",
          // 选中状态 - 更明显的视觉反馈
          isSelected && [
            "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent",
            "border-primary/30",
            "shadow-lg shadow-primary/10 dark:shadow-primary/5",
          ],
          // 悬停时的缩放效果
          "hover:scale-[1.01] active:scale-[0.99]",
        )}
        style={{
          animationDelay: `${index * 30}ms`,
        }}
      >
        {/* 选中指示器 - 左侧发光条 */}
        <div
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300",
            isSelected 
              ? "h-10 bg-gradient-to-b from-primary/80 via-primary to-primary/80 shadow-lg shadow-primary/50" 
              : "h-0 bg-transparent"
          )}
        />

        {/* 频道 Logo */}
        <div 
          className={cn(
            "relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0",
            "bg-gradient-to-br from-secondary to-secondary/50",
            "ring-1 ring-border transition-all duration-300",
            isSelected && "ring-primary/40 shadow-md shadow-primary/20",
          )}
        >
          {channel.logo && !logoError ? (
            <Image
              src={channel.logo}
              alt={channel.name}
              fill
              className={cn(
                "object-contain p-1.5 transition-transform duration-300",
                isHovered && "scale-110",
              )}
              unoptimized
              loading="lazy"
              decoding="async"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground text-lg font-bold">
                {channel.name.charAt(0)}
              </span>
            </div>
          )}
          
          {/* 播放按钮悬浮层 */}
          {isPlayable && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPlay()
              }}
              className={cn(
                "absolute inset-0 flex items-center justify-center",
                "bg-black/70 backdrop-blur-sm",
                "opacity-0 group-hover:opacity-100 transition-all duration-200",
                "hover:bg-primary/30",
              )}
            >
              <Play className="w-5 h-5 text-white fill-white drop-shadow-lg" />
            </button>
          )}
        </div>

        {/* 频道信息 */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* 频道名称行 */}
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "text-sm font-semibold truncate transition-colors duration-200",
                isSelected ? "text-foreground" : "text-foreground/85 group-hover:text-foreground",
              )}
            >
              {channel.name}
            </h3>
          </div>

          {/* 标签行 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 直播标签 */}
            {isPlayable && (
              <span className="inline-flex items-center gap-1 badge-live">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            )}
            
            {/* 流数量 */}
            {streamCount > 1 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-medium">
                <Layers className="w-2.5 h-2.5" />
                {streamCount}
              </span>
            )}
            
            {/* HD 标签 */}
            {isHD && (
              <span className="badge-hd">HD</span>
            )}
            
            {/* 4K 标签 */}
            {is4K && (
              <span className="badge-4k">4K</span>
            )}
            
            {/* EPG 标签 */}
            {hasEpg && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-medium">
                <Sparkles className="w-2.5 h-2.5" />
                EPG
              </span>
            )}
          </div>
        </div>

        {/* 收藏按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className={cn(
            "flex-shrink-0 p-2 rounded-xl transition-all duration-200",
            "hover:bg-secondary active:scale-90",
            "focus-ring",
          )}
          title={isFavorite ? "取消收藏" : "收藏"}
          aria-label={isFavorite ? "取消收藏" : "收藏"}
        >
          <Star
            className={cn(
              "w-5 h-5 transition-all duration-300",
              isFavorite
                ? "text-amber-500 fill-amber-500 drop-shadow-lg"
                : "text-muted-foreground hover:text-amber-500/70",
            )}
          />
        </button>

        {/* 悬停时的边框发光效果 */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300",
            "ring-1 ring-inset",
            isHovered && !isSelected ? "ring-border" : "ring-transparent",
          )}
        />
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
      prevProps.channel.logo === nextProps.channel.logo &&
      prevProps.index === nextProps.index
    )
  },
)
