"use client"

import { useMemo, useState, useCallback } from "react"
import type { Channel, Stream } from "@/lib/iptv"
import { ChannelCard } from "./channel-card"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Tv2, 
  Star, 
  ArrowLeft, 
  CheckCircle2, 
  RotateCcw, 
  Loader2, 
  Search,
  X,
  Radio,
  Sparkles
} from "lucide-react"
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
  const [searchQuery, setSearchQuery] = useState("")

  // 根据搜索过滤频道
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels
    const query = searchQuery.toLowerCase()
    return channels.filter(
      (ch) =>
        ch.name.toLowerCase().includes(query) ||
        ch.categories.some((cat) => cat.toLowerCase().includes(query))
    )
  }, [channels, searchQuery])

  const handleClearSearch = useCallback(() => {
    setSearchQuery("")
  }, [])

  // 加载状态
  if (loading) {
    return (
      <div className="w-[420px] flex-shrink-0 flex flex-col h-full glass border-r border-white/5">
        {/* 头部骨架 */}
        <div className="p-5 border-b border-white/5 space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" suppressHydrationWarning />
          <Skeleton className="h-8 w-48" suppressHydrationWarning />
        </div>
        {/* 列表骨架 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="h-20 w-full rounded-2xl" 
              style={{ animationDelay: `${i * 100}ms` }}
              suppressHydrationWarning 
            />
          ))}
        </div>
      </div>
    )
  }

  // 空状态
  if (channels.length === 0 && !searchQuery) {
    return (
      <div className="w-[420px] flex-shrink-0 flex flex-col h-full glass border-r border-white/5">
        <Header
          showFavorites={showFavorites}
          countryName={countryName}
          channelCount={0}
          favoritesCount={favoritesCount}
          onToggleFavorites={onToggleFavorites}
          showPlayableOnly={showPlayableOnly}
          isTestingPlayable={isTestingPlayable}
          testProgress={testProgress}
          onTestPlayableChannels={onTestPlayableChannels}
          onResetPlayableFilter={onResetPlayableFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={handleClearSearch}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {showFavorites ? (
            <EmptyState
              icon={<Star className="w-16 h-16 text-amber-500/20" />}
              title="暂无收藏"
              description="点击频道旁的星标添加收藏"
            />
          ) : (
            <EmptyState
              icon={<Tv2 className="w-16 h-16 text-cyan-500/20" />}
              title="暂无频道数据"
              description="请稍后再试或刷新页面"
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-[420px] flex-shrink-0 flex flex-col h-full glass border-r border-white/5">
      <Header
        showFavorites={showFavorites}
        countryName={countryName}
        channelCount={filteredChannels.length}
        favoritesCount={favoritesCount}
        onToggleFavorites={onToggleFavorites}
        showPlayableOnly={showPlayableOnly}
        isTestingPlayable={isTestingPlayable}
        testProgress={testProgress}
        onTestPlayableChannels={onTestPlayableChannels}
        onResetPlayableFilter={onResetPlayableFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={handleClearSearch}
      />
      
      {/* 频道列表 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {filteredChannels.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Search className="w-12 h-12 text-white/10 mb-4" />
            <p className="text-white/40 text-sm">未找到 "{searchQuery}"</p>
            <button
              onClick={handleClearSearch}
              className="mt-3 text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
            >
              清除搜索
            </button>
        </div>
        ) : (
          filteredChannels.map((channel, index) => {
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
                index={index}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// ===== 头部组件 =====
interface HeaderProps {
  showFavorites?: boolean
  countryName?: string
  channelCount: number
  favoritesCount: number
  onToggleFavorites?: () => void
  showPlayableOnly: boolean
  isTestingPlayable: boolean
  testProgress: { completed: number; total: number }
  onTestPlayableChannels?: () => void
  onResetPlayableFilter?: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
  onClearSearch: () => void
}

function Header({
  showFavorites,
  countryName,
  channelCount,
  favoritesCount,
  onToggleFavorites,
  showPlayableOnly,
  isTestingPlayable,
  testProgress,
  onTestPlayableChannels,
  onResetPlayableFilter,
  searchQuery,
  onSearchChange,
  onClearSearch,
}: HeaderProps) {
  return (
    <div className="p-5 border-b border-white/5 space-y-4">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索频道..."
          className={cn(
            "w-full h-11 pl-11 pr-10 rounded-xl",
            "bg-white/5 border border-white/10",
            "text-white placeholder:text-white/30",
            "focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20",
            "transition-all duration-200",
          )}
        />
        {searchQuery && (
          <button
            onClick={onClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        )}
      </div>

      {/* 可播放频道检查按钮 */}
      {!showFavorites && onTestPlayableChannels && (
        <div className="flex items-center gap-2">
          {isTestingPlayable ? (
            <TestingProgress progress={testProgress} />
          ) : showPlayableOnly ? (
            <ResetFilterButton 
              count={channelCount} 
              onReset={onResetPlayableFilter!} 
            />
          ) : (
            <TestButton onClick={onTestPlayableChannels} />
          )}
        </div>
      )}

      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showFavorites ? (
            <>
              <div className="p-2 rounded-xl bg-amber-500/20">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">收藏频道</h2>
                <p className="text-xs text-white/40">{channelCount} 个频道</p>
              </div>
            </>
          ) : (
            <>
              <div className="p-2 rounded-xl bg-cyan-500/20">
                <Radio className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{countryName || "全部频道"}</h2>
                <p className="text-xs text-white/40">{channelCount} 个频道可用</p>
              </div>
            </>
          )}
        </div>

        {/* 收藏切换按钮 */}
        {onToggleFavorites && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorites()
            }}
            className={cn(
              "relative p-2.5 rounded-xl transition-all duration-200",
              "hover:bg-white/10 active:scale-95",
              showFavorites && "bg-white/10",
            )}
            title={showFavorites ? "返回全部频道" : `查看收藏 (${favoritesCount})`}
          >
            {showFavorites ? (
              <ArrowLeft className="w-5 h-5 text-white/80" />
            ) : (
              <>
                <Star className={cn(
                  "w-5 h-5 transition-colors",
                  favoritesCount > 0 ? "text-amber-400" : "text-white/40"
                )} />
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center px-1.5 rounded-full bg-amber-500 text-[10px] font-bold text-black">
                    {favoritesCount > 99 ? "99+" : favoritesCount}
                  </span>
                )}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ===== 测试进度组件 =====
function TestingProgress({ progress }: { progress: { completed: number; total: number } }) {
  const percentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0
  
  return (
    <div className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
      <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-cyan-400">正在检测...</span>
          <span className="text-xs text-white/50">{percentage}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-[10px] text-white/40 mt-1">
          {progress.completed} / {progress.total} 个频道
        </p>
      </div>
    </div>
  )
}

// ===== 重置按钮组件 =====
function ResetFilterButton({ count, onReset }: { count: number; onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={onReset}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
        "bg-emerald-500/15 border border-emerald-500/20",
        "text-emerald-400 hover:bg-emerald-500/25",
        "transition-all duration-200 active:scale-98",
      )}
    >
      <RotateCcw className="w-4 h-4" />
      <span className="text-sm font-medium">显示全部</span>
      <span className="text-xs text-emerald-300/60">({count} 可播放)</span>
    </button>
  )
}

// ===== 测试按钮组件 =====
function TestButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
        "bg-cyan-500/15 border border-cyan-500/20",
        "text-cyan-400 hover:bg-cyan-500/25",
        "transition-all duration-200 active:scale-98",
      )}
    >
      <CheckCircle2 className="w-4 h-4" />
      <span className="text-sm font-medium">检测可播放频道</span>
    </button>
  )
}

// ===== 空状态组件 =====
function EmptyState({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <div className="text-center animate-fade-in">
      <div className="mb-6 animate-float">{icon}</div>
      <h3 className="text-lg font-medium text-white/60 mb-2">{title}</h3>
      <p className="text-sm text-white/40">{description}</p>
    </div>
  )
}
