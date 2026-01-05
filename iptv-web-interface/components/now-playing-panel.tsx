"use client"

import type { Channel, Stream } from "@/lib/iptv"
import { useEffect, useRef, useState } from "react"
import { 
  Copy, 
  AlertCircle, 
  Clock, 
  Play, 
  Pause,
  Loader2, 
  Maximize, 
  Minimize,
  Volume2,
  VolumeX,
  Radio,
  Layers,
  ExternalLink,
  Check,
  SkipForward
} from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Hls from "hls.js"

interface NowPlayingPanelProps {
  channel: Channel | null
  stream: Stream | null
  streams?: Stream[]
}

export function NowPlayingPanel({ channel, stream, streams = [] }: NowPlayingPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [playbackError, setPlaybackError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState("")
  const [copied, setCopied] = useState(false)
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null)
  const [logoError, setLogoError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 获取当前要尝试的流
  const currentStreams = streams.length > 0 ? streams : stream ? [stream] : []
  const currentStream = currentStreams[currentStreamIndex] || stream

  // 自动隐藏控制栏
  useEffect(() => {
    const hideControls = () => {
      if (isPlaying && !playbackError) {
        setShowControls(false)
      }
    }

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }

    if (showControls && isPlaying) {
      controlsTimeoutRef.current = setTimeout(hideControls, 3000)
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [showControls, isPlaying, playbackError])

  const handleMouseMove = () => {
    setShowControls(true)
  }

  // 时间更新
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // 初始化播放器
  useEffect(() => {
    if (!currentStream || !videoRef.current) return

    // 清理之前的播放器实例和超时
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    if (loadTimeout) {
      clearTimeout(loadTimeout)
      setLoadTimeout(null)
    }

    setPlaybackError(false)
    setIsPlaying(false)
    setErrorMessage("")
    setIsLoading(true)
    setLogoError(false)

    const video = videoRef.current
    const isHLS = currentStream.url.includes(".m3u8") || currentStream.url.includes("m3u8")

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        xhrSetup: (xhr, url) => {
          const userAgent =
            currentStream.user_agent ||
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          xhr.setRequestHeader("User-Agent", userAgent)
          if (currentStream.http_referrer) {
            xhr.setRequestHeader("Referer", currentStream.http_referrer)
          }
        },
      })

      hlsRef.current = hls
      hls.loadSource(currentStream.url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false)
        setPlaybackError(false)
        setErrorMessage("")
        if (loadTimeout) {
          clearTimeout(loadTimeout)
          setLoadTimeout(null)
        }
        video.play().catch((err) => {
          console.warn("Auto-play failed:", err)
        })
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (!data) return

        if (data.fatal) {
          setIsLoading(false)
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMessage("网络错误，无法加载视频流")
              setPlaybackError(true)
              try {
                hls.startLoad()
              } catch (e) {
                if (currentStreams.length > currentStreamIndex + 1) {
                  setTimeout(() => setCurrentStreamIndex((prev) => prev + 1), 2000)
                }
              }
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMessage("媒体错误，尝试恢复中...")
              try {
                hls.recoverMediaError()
              } catch (e) {
                setPlaybackError(true)
                if (currentStreams.length > currentStreamIndex + 1) {
                  setTimeout(() => setCurrentStreamIndex((prev) => prev + 1), 2000)
                }
              }
              break
            default:
              setErrorMessage("播放错误")
              setPlaybackError(true)
              if (currentStreams.length > currentStreamIndex + 1) {
                setTimeout(() => setCurrentStreamIndex((prev) => prev + 1), 2000)
              }
              break
          }
        }
      })
    } else if (isHLS && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = currentStream.url
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false)
        setPlaybackError(false)
        video.play().catch(console.warn)
      })
    } else {
      video.src = currentStream.url
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false)
        setPlaybackError(false)
        video.play().catch(console.warn)
      })
    }

    // 加载超时
    const timeout = setTimeout(() => {
      if (!isPlaying && !playbackError) {
        setErrorMessage("加载超时，正在尝试其他流源...")
        setPlaybackError(true)
        setIsLoading(false)
        if (currentStreams.length > currentStreamIndex + 1) {
          setTimeout(() => setCurrentStreamIndex((prev) => prev + 1), 1000)
        }
      }
    }, 15000)
    setLoadTimeout(timeout)

    const handlePlay = () => {
      setIsPlaying(true)
      setIsLoading(false)
      setPlaybackError(false)
      setErrorMessage("")
    }

    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    const handleError = () => {
      const error = video.error
      setIsLoading(false)

      if (error) {
        const messages: Record<number, string> = {
          1: "播放被中止",
          2: "网络错误",
          3: "视频解码失败",
          4: "格式不支持",
        }
        setErrorMessage(messages[error.code] || `播放错误 (${error.code})`)
        setPlaybackError(true)

        if ([2, 3, 4].includes(error.code) && currentStreams.length > currentStreamIndex + 1) {
          setTimeout(() => setCurrentStreamIndex((prev) => prev + 1), 2000)
        }
      }
    }

    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("error", handleError)

    return () => {
      if (loadTimeout) clearTimeout(loadTimeout)
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("error", handleError)
    }
  }, [currentStream, currentStreamIndex, currentStreams])

  const handlePlay = () => videoRef.current?.play().catch(console.error)
  const handlePause = () => videoRef.current?.pause()

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error("Fullscreen error:", error)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const tryNextStream = () => {
    if (currentStreams.length > currentStreamIndex + 1) {
      setCurrentStreamIndex((prev) => prev + 1)
      setPlaybackError(false)
      setErrorMessage("")
    }
  }

  const copyStreamUrl = async () => {
    if (!currentStream) return
    await navigator.clipboard.writeText(currentStream.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 空状态 - 未选择频道
  if (!channel) {
    return (
      <div className="flex-1 relative h-full bg-gradient-to-br from-background via-card to-background overflow-hidden">
        {/* 装饰性背景元素 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        </div>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          <div className="relative mb-8">
            <div className="w-28 h-28 rounded-3xl bg-secondary flex items-center justify-center border border-border animate-pulse-glow">
              <Radio className="w-12 h-12 text-muted-foreground" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Play className="w-5 h-5 text-primary fill-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground/80 mb-2">选择频道开始观看</h2>
          <p className="text-muted-foreground text-center max-w-md">
            从左侧列表中选择一个频道，点击即可开始播放直播内容
          </p>
        </div>

        {/* 时间显示 */}
        <div className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground/60 font-mono text-sm">{currentTime}</span>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className="flex-1 relative h-full overflow-hidden bg-black"
      onMouseMove={handleMouseMove}
      onClick={() => setShowControls(true)}
    >
      {/* 背景模糊层 */}
      <div className="absolute inset-0">
        {channel.logo && !logoError ? (
          <Image
            src={channel.logo}
            alt=""
            fill
            className="object-cover scale-150 blur-3xl opacity-20"
            unoptimized
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-purple-900/10 to-blue-900/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      {/* 视频播放器 */}
      {currentStream && (
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            className={cn(
              "w-full h-full object-contain transition-opacity duration-500",
              isPlaying && !playbackError ? "opacity-100" : "opacity-0",
            )}
            playsInline
            muted={isMuted}
          />
          
          {/* 加载指示器 */}
          {isLoading && !playbackError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-primary/30 animate-ping absolute inset-0" />
                  <div className="w-16 h-16 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-white/80 font-medium">正在连接...</p>
                  <p className="text-white/40 text-sm mt-1">
                    流源 {currentStreamIndex + 1} / {currentStreams.length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 顶部信息栏 */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 p-6 z-10",
          "bg-gradient-to-b from-black/80 to-transparent",
          "transition-all duration-300",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4",
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {channel.logo && !logoError ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 ring-2 ring-white/20">
                <Image
                  src={channel.logo}
                  alt={channel.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-contain p-1"
                  unoptimized
                  onError={() => setLogoError(true)}
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center ring-2 ring-white/20">
                <span className="text-2xl font-bold text-white/40">{channel.name.charAt(0)}</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-live">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1" />
                  直播中
                </span>
                {currentStreams.length > 1 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs">
                    <Layers className="w-3 h-3" />
                    {currentStreams.length} 个流源
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white">{channel.name}</h2>
              <p className="text-white/50 text-sm">{channel.categories[0] || "综合频道"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <Clock className="w-4 h-4 text-white/40" />
            <span className="text-white/60 font-mono text-sm">{currentTime}</span>
          </div>
        </div>
      </div>

      {/* 底部控制栏 */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 p-6 z-10",
          "bg-gradient-to-t from-black via-black/80 to-transparent",
          "transition-all duration-300",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
      >
        {currentStream && !playbackError && !isLoading ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 播放/暂停 */}
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center",
                  "bg-white text-black hover:bg-white/90",
                  "transition-all duration-200 active:scale-95",
                  "shadow-lg shadow-white/20",
                )}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-1" />
                )}
              </button>

              {/* 音量 */}
              <button
                onClick={toggleMute}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  "bg-white/10 hover:bg-white/20 border border-white/10",
                  "transition-all duration-200 active:scale-95",
                )}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white/80" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white/80" />
                )}
              </button>

              {/* 下一个流源 */}
              {currentStreams.length > 1 && (
                <button
                  onClick={tryNextStream}
                  disabled={currentStreamIndex >= currentStreams.length - 1}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    "bg-white/10 hover:bg-white/20 border border-white/10",
                    "transition-all duration-200 active:scale-95",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                  )}
                  title={`切换流源 (${currentStreamIndex + 1}/${currentStreams.length})`}
                >
                  <SkipForward className="w-5 h-5 text-white/80" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* 复制链接 */}
              <button
                onClick={copyStreamUrl}
                className={cn(
                  "h-10 px-4 rounded-full flex items-center gap-2",
                  "bg-white/10 hover:bg-white/20 border border-white/10",
                  "transition-all duration-200 active:scale-95",
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-white/80" />
                    <span className="text-sm text-white/80">复制链接</span>
                  </>
                )}
              </button>

              {/* 全屏 */}
              <button
                onClick={toggleFullscreen}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  "bg-white/10 hover:bg-white/20 border border-white/10",
                  "transition-all duration-200 active:scale-95",
                )}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-white/80" />
                ) : (
                  <Maximize className="w-5 h-5 text-white/80" />
                )}
              </button>
            </div>
          </div>
        ) : playbackError ? (
          <ErrorDisplay
            errorMessage={errorMessage}
            currentStreamIndex={currentStreamIndex}
            totalStreams={currentStreams.length}
            onTryNext={tryNextStream}
            onCopyUrl={copyStreamUrl}
            copied={copied}
            streamUrl={currentStream?.url}
          />
        ) : null}
      </div>
    </div>
  )
}

// ===== 错误显示组件 =====
function ErrorDisplay({
  errorMessage,
  currentStreamIndex,
  totalStreams,
  onTryNext,
  onCopyUrl,
  copied,
  streamUrl,
}: {
  errorMessage: string
  currentStreamIndex: number
  totalStreams: number
  onTryNext: () => void
  onCopyUrl: () => void
  copied: boolean
  streamUrl?: string
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* 错误信息 */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-amber-400">无法播放此流</p>
          {errorMessage && (
            <p className="text-amber-300/70 text-sm mt-1">{errorMessage}</p>
          )}
          {totalStreams > 1 && (
            <p className="text-white/40 text-xs mt-2">
              正在尝试 {currentStreamIndex + 1} / {totalStreams} 个流源
            </p>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        {totalStreams > currentStreamIndex + 1 && (
          <button
            onClick={onTryNext}
            className={cn(
              "flex-1 h-12 rounded-xl flex items-center justify-center gap-2",
              "bg-primary/20 hover:bg-primary/30 border border-primary/30",
              "text-primary font-medium transition-all active:scale-98",
            )}
          >
            <SkipForward className="w-4 h-4" />
            尝试下一个流源
          </button>
        )}
        <button
          onClick={onCopyUrl}
          className={cn(
            "flex-1 h-12 rounded-xl flex items-center justify-center gap-2",
            "bg-white/10 hover:bg-white/15 border border-white/10",
            "text-white/80 font-medium transition-all active:scale-98",
          )}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "已复制" : "复制流地址"}
        </button>
      </div>

      {/* 提示信息 */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-white/50 text-xs font-medium mb-2 flex items-center gap-2">
          <ExternalLink className="w-3.5 h-3.5" />
          使用外部播放器
        </p>
        <p className="text-white/30 text-xs leading-relaxed">
          部分 IPTV 流需要特定的播放器支持。推荐使用 VLC、PotPlayer、IINA 等播放器打开复制的流地址。
        </p>
      </div>
    </div>
  )
}
