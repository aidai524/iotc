"use client"

import type { Country, Channel } from "@/lib/iptv"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Star } from "lucide-react"

interface CountrySidebarProps {
  countries: Country[]
  channels: Channel[]
  selectedCountry: string | null
  onSelectCountry: (code: string) => void
  loading?: boolean
  showFavorites: boolean
  onToggleFavorites: () => void
  favoritesCount: number
}

export function CountrySidebar({
  countries,
  channels,
  selectedCountry,
  onSelectCountry,
  loading,
  showFavorites,
  onToggleFavorites,
  favoritesCount,
}: CountrySidebarProps) {
  const getChannelCount = (countryCode: string) => {
    return channels.filter((ch) => ch.country.toLowerCase() === countryCode.toLowerCase()).length
  }

  const sortedCountries = [...countries]
    .sort((a, b) => {
      const countA = getChannelCount(a.code)
      const countB = getChannelCount(b.code)
      return countB - countA
    })
    .filter((c) => getChannelCount(c.code) > 0)

  if (loading) {
    return (
      <div className="w-64 flex-shrink-0 bg-[#0a0a12]/80 border-r border-white/5 flex flex-col h-full">
        <div className="p-4 border-b border-white/5">
          <Skeleton className="h-6 w-24 bg-white/10" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 flex-shrink-0 bg-[#0a0a12]/80 border-r border-white/5 flex flex-col h-full">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-lg font-bold text-white/90 tracking-wide">直播电视</h2>
      </div>

      <div className="px-2 pt-2">
        <button
          onClick={onToggleFavorites}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
            "hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
            showFavorites && "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 shadow-lg shadow-yellow-500/10",
          )}
        >
          <Star className={cn("w-5 h-5", showFavorites ? "text-yellow-400 fill-yellow-400" : "text-yellow-400/60")} />
          <div className="flex-1 text-left min-w-0">
            <p className={cn("text-sm font-medium transition-colors", showFavorites ? "text-white" : "text-white/70")}>
              收藏
            </p>
            <p className="text-xs text-white/40">{favoritesCount} 个频道</p>
          </div>
          {showFavorites && <div className="w-1.5 h-8 bg-gradient-to-b from-yellow-400 to-amber-500 rounded-full" />}
        </button>
      </div>

      <div className="px-4 py-2">
        <div className="h-px bg-white/10" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {sortedCountries.map((country) => {
          const isSelected = !showFavorites && selectedCountry === country.code
          const channelCount = getChannelCount(country.code)

          return (
            <button
              key={country.code}
              onClick={() => onSelectCountry(country.code)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                "hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
                isSelected && "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 shadow-lg shadow-cyan-500/10",
              )}
            >
              <span className="text-2xl flex-shrink-0">{country.flag}</span>
              <div className="flex-1 text-left min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate transition-colors",
                    isSelected ? "text-white" : "text-white/70",
                  )}
                >
                  {country.name}
                </p>
                <p className="text-xs text-white/40">{channelCount} 个频道</p>
              </div>
              {isSelected && <div className="w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
