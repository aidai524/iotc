"use client"

import { useMemo } from "react"
import type { Channel, Stream } from "@/lib/iptv"
import { ChannelCard } from "./channel-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tv2, Star, ArrowLeft, CheckCircle2, RotateCcw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChannelListProps {
  channels: Channel[]
  streamMap: Map<string, Stream[]>
  selectedChannelId: string | null
  favorites: Set<string>
  onSelectChannel: (channel: Channel) => void
  onToggleFavorite: (channelId: string) => void
  onPlay: (channel: Channel) => void
  loading?: boolean
  countryName?: string
  showFavorites?: boolean
  onToggleFavorites?: () => void
  favoritesCount?: number
  showPlayableOnly?: boolean
  isTestingPlayable?: boolean
  testProgress?: { completed: number; total: number }
  onTestPlayableChannels?: () => void
  onResetPlayableFilter?: () => void
}

export function ChannelList({
  channels,
  streamMap,
  selectedChannelId,
  favorites,
  onSelectChannel,
  onToggleFavorite,
  onPlay,
  loading,
  countryName,
  showFavorites,
  onToggleFavorites,
  favoritesCount = 0,
  showPlayableOnly = false,
  isTestingPlayable = false,
  testProgress = { completed: 0, total: 0 },
  onTestPlayableChannels,
  onResetPlayableFilter,
}: ChannelListProps) {
  if (loading) {
    return (
      <div className="w-96 flex-shrink-0 flex flex-col h-full bg-[#0d0d18]/60 border-r border-white/5">
        <div className="p-4 border-b border-white/5">
          <Skeleton className="h-6 w-48 bg-white/10" suppressHydrationWarning />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-white/5 rounded-xl" suppressHydrationWarning />
          ))}
        </div>
      </div>
    )
  }

  if (channels.length === 0) {
    return (
      <div className="w-96 flex-shrink-0 flex flex-col h-full bg-[#0d0d18]/60 border-r border-white/5">
        <div className="p-4 border-b border-white/5 space-y-3">
          {/* 可播放频道检查按钮区域 */}
          {!showFavorites && onTestPlayableChannels && (
            <div className="flex items-center gap-2">
              {isTestingPlayable ? (
                // 测试中：显示进度信息
                <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-cyan-400">
                      测试中...
                    </span>
                    <span className="text-xs text-white/60">
                      {testProgress.completed} / {testProgress.total} 个频道
                      {testProgress.total > 0 && (
                        <span className="ml-1">
                          ({Math.round((testProgress.completed / testProgress.total) * 100)}%)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ) : showPlayableOnly ? (
                // 测试完成且已过滤：显示恢复按钮
                <button
                  type="button"
                  onClick={onResetPlayableFilter}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg",
                    "bg-green-500/20 hover:bg-green-500/30 text-green-400",
                    "transition-all active:scale-95 cursor-pointer",
                  )}
                  title="恢复默认列表"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm font-medium">恢复默认列表</span>
                </button>
              ) : (
                // 未测试：显示开始测试按钮
                <button
                  type="button"
                  onClick={onTestPlayableChannels}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg",
                    "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400",
                    "transition-all active:scale-95 cursor-pointer",
                  )}
                  title="测试所有可播放频道"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">检查可播放频道</span>
                </button>
              )}
            </div>
          )}
          
          {/* 标题和收藏切换按钮 */}
          <div className="flex items-center justify-between">
            {showFavorites ? (
              <h2 className="text-lg font-bold text-white/90 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                收藏 <span className="text-white/40 font-normal">• 0 个频道</span>
              </h2>
            ) : (
              <h2 className="text-lg font-bold text-white/90">
                {countryName} <span className="text-white/40 font-normal">• 0 个频道</span>
              </h2>
            )}
            {onToggleFavorites && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onToggleFavorites()
                }}
                className={cn(
                  "p-2 rounded-lg transition-all active:scale-95 cursor-pointer",
                  showFavorites
                    ? "bg-white/10 hover:bg-white/15"
                    : "hover:bg-white/5",
                )}
                title={showFavorites ? "返回全部频道" : "显示收藏"}
                aria-label={showFavorites ? "返回全部频道" : "显示收藏"}
              >
                {showFavorites ? (
                  <ArrowLeft className="w-5 h-5 text-white/80 hover:text-white transition-colors" />
                ) : (
                  <Star className="w-5 h-5 text-white/40 hover:text-yellow-400 transition-colors" />
                )}
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          {showFavorites ? (
            <>
              <Star className="w-16 h-16 text-white/20 mb-4" />
              <p className="text-white/40 text-lg">暂无收藏</p>
              <p className="text-white/30 text-sm mt-1">点击星标添加收藏频道</p>
            </>
          ) : (
            <>
              <Tv2 className="w-16 h-16 text-white/20 mb-4" />
              <p className="text-white/40 text-lg">暂无频道数据</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-96 flex-shrink-0 flex flex-col h-full bg-[#0d0d18]/60 border-r border-white/5">
      <div className="p-4 border-b border-white/5 space-y-3">
        {/* 可播放频道检查按钮区域 */}
        {!showFavorites && onTestPlayableChannels && (
          <div className="flex items-center gap-2">
            {isTestingPlayable ? (
              // 测试中：显示进度信息
              <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-cyan-400">
                    测试中...
                  </span>
                  <span className="text-xs text-white/60">
                    {testProgress.completed} / {testProgress.total} 个频道
                    {testProgress.total > 0 && (
                      <span className="ml-1">
                        ({Math.round((testProgress.completed / testProgress.total) * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ) : showPlayableOnly ? (
              // 测试完成且已过滤：显示恢复按钮
              <>
                <button
                  type="button"
                  onClick={onResetPlayableFilter}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg",
                    "bg-green-500/20 hover:bg-green-500/30 text-green-400",
                    "transition-all active:scale-95 cursor-pointer",
                  )}
                  title="恢复默认列表"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm font-medium">恢复默认列表</span>
                </button>
                <div className="text-xs text-white/40 px-2">
                  {channels.length} 个可播放
                </div>
              </>
            ) : (
              // 未测试：显示开始测试按钮
              <button
                type="button"
                onClick={onTestPlayableChannels}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg",
                  "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400",
                  "transition-all active:scale-95 cursor-pointer",
                )}
                title="测试所有可播放频道"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">检查可播放频道</span>
              </button>
            )}
          </div>
        )}
        
        {/* 标题和收藏切换按钮 */}
        <div className="flex items-center justify-between">
          {showFavorites ? (
            <h2 className="text-lg font-bold text-white/90 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              收藏 <span className="text-white/40 font-normal">• {channels.length} 个频道</span>
            </h2>
          ) : (
            <h2 className="text-lg font-bold text-white/90">
              {countryName} <span className="text-white/40 font-normal">• {channels.length} 个频道</span>
            </h2>
          )}
          {onToggleFavorites && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleFavorites()
              }}
              className={cn(
                "p-2 rounded-lg transition-all active:scale-95 cursor-pointer",
                showFavorites
                  ? "bg-white/10 hover:bg-white/15"
                  : "hover:bg-white/5",
              )}
              title={showFavorites ? "返回全部频道" : "显示收藏"}
              aria-label={showFavorites ? "返回全部频道" : "显示收藏"}
            >
              {showFavorites ? (
                <ArrowLeft className="w-5 h-5 text-white/80 hover:text-white transition-colors" />
              ) : (
                <Star className="w-5 h-5 text-white/40 hover:text-yellow-400 transition-colors" />
              )}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {channels.map((channel) => {
          // 预先计算 props，避免在渲染时计算
          const isSelected = selectedChannelId === channel.id
          const isFavorite = favorites.has(channel.id)

          return (
            <ChannelCard
              key={channel.id}
              channel={channel}
              streamMap={streamMap}
              isSelected={isSelected}
              isFavorite={isFavorite}
              onSelect={() => onSelectChannel(channel)}
              onToggleFavorite={() => onToggleFavorite(channel.id)}
              onPlay={() => onPlay(channel)}
            />
          )
        })}
      </div>
    </div>
  )
}
