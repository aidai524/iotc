"use client"

import type { Channel, Stream } from "@/lib/iptv"
import { useEffect, useRef, useState } from "react"
import { Copy, AlertCircle, Clock, Play, Loader2, Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Hls from "hls.js"

interface NowPlayingPanelProps {
  channel: Channel | null
  stream: Stream | null
  streams?: Stream[] // 添加多个流源支持
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
  const containerRef = useRef<HTMLDivElement>(null)

  // 获取当前要尝试的流
  const currentStreams = streams.length > 0 ? streams : stream ? [stream] : []
  const currentStream = currentStreams[currentStreamIndex] || stream

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString("en-GB", {
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

    // 如果是 HLS 流且浏览器支持 hls.js
    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        // 配置 HTTP headers
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
        // 自动播放
        video.play().catch((err) => {
          console.warn("Auto-play failed:", err)
        })
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        // 检查 data 是否存在且有效
        if (!data) {
          console.warn("HLS.js error: empty error data")
          return
        }

        // 记录错误信息（但不输出空对象）
        if (data.fatal !== undefined || data.type !== undefined || data.details) {
          console.error("HLS.js error:", {
            fatal: data.fatal,
            type: data.type,
            details: data.details,
            error: data.error,
            url: data.url,
          })
        }

        // 只处理致命错误
        if (data.fatal) {
          setIsLoading(false)
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMessage("网络错误，无法加载视频")
              setPlaybackError(true)
              // 尝试恢复
              try {
                hls.startLoad()
              } catch (e) {
                console.warn("Failed to recover from network error:", e)
                // 如果恢复失败，尝试下一个流源
                if (currentStreams.length > currentStreamIndex + 1) {
                  setTimeout(() => {
                    setCurrentStreamIndex((prev) => prev + 1)
                  }, 2000)
                }
              }
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMessage("媒体错误，尝试恢复...")
              try {
                hls.recoverMediaError()
              } catch (e) {
                console.warn("Failed to recover from media error:", e)
                setPlaybackError(true)
                setIsLoading(false)
                if (currentStreams.length > currentStreamIndex + 1) {
                  setTimeout(() => {
                    setCurrentStreamIndex((prev) => prev + 1)
                  }, 2000)
                }
              }
              break
            default:
              setErrorMessage("播放错误，尝试下一个流源")
              setPlaybackError(true)
              setIsLoading(false)
              // 尝试下一个流源
              if (currentStreams.length > currentStreamIndex + 1) {
                setTimeout(() => {
                  setCurrentStreamIndex((prev) => prev + 1)
                }, 2000)
              }
              break
          }
        } else {
          // 非致命错误，只记录日志，不中断播放
          console.warn("HLS.js non-fatal error:", data.details || data.type)
        }
      })
    } else if (isHLS && video.canPlayType("application/vnd.apple.mpegurl")) {
      // 原生 HLS 支持（Safari）
      video.src = currentStream.url
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false)
        setPlaybackError(false)
        setErrorMessage("")
        if (loadTimeout) {
          clearTimeout(loadTimeout)
          setLoadTimeout(null)
        }
        // 自动播放
        video.play().catch((err) => {
          console.warn("Auto-play failed:", err)
        })
      })
    } else {
      // 普通视频文件
      video.src = currentStream.url
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false)
        setPlaybackError(false)
        setErrorMessage("")
        if (loadTimeout) {
          clearTimeout(loadTimeout)
          setLoadTimeout(null)
        }
        // 自动播放
        video.play().catch((err) => {
          console.warn("Auto-play failed:", err)
        })
      })
    }

    // 设置加载超时（15秒）
    const timeout = setTimeout(() => {
      if (!isPlaying && !playbackError) {
        setErrorMessage("加载超时，流可能不可用")
        setPlaybackError(true)
        setIsLoading(false)
        // 尝试下一个流源
        if (currentStreams.length > currentStreamIndex + 1) {
          setTimeout(() => {
            setCurrentStreamIndex((prev) => prev + 1)
          }, 1000)
        }
      }
    }, 15000)
    setLoadTimeout(timeout)

    // 事件监听
    const handlePlay = () => {
      setIsPlaying(true)
      setIsLoading(false)
      setPlaybackError(false)
      setErrorMessage("")
      if (loadTimeout) {
        clearTimeout(loadTimeout)
        setLoadTimeout(null)
      }
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    const handleError = () => {
      const error = video.error
      setIsLoading(false)
      if (loadTimeout) {
        clearTimeout(loadTimeout)
        setLoadTimeout(null)
      }

      if (error) {
        let errorMsg = "播放失败"
        let shouldTryNext = false

        switch (error.code) {
          case 1: // MEDIA_ERR_ABORTED
            errorMsg = "播放被中止"
            break
          case 2: // MEDIA_ERR_NETWORK
            errorMsg = "网络错误，无法加载视频"
            shouldTryNext = true
            break
          case 3: // MEDIA_ERR_DECODE
            errorMsg = "视频解码失败，格式不支持"
            shouldTryNext = true
            break
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            errorMsg = "视频格式不支持或源不可用"
            shouldTryNext = true
            break
          default:
            errorMsg = `播放错误 (${error.code})`
            shouldTryNext = true
        }

        console.error("Video error:", {
          code: error.code,
          message: errorMsg,
          streamUrl: currentStream.url,
        })

        setErrorMessage(errorMsg)
        setPlaybackError(true)

        // 尝试下一个流源
        if (shouldTryNext && currentStreams.length > currentStreamIndex + 1) {
          setTimeout(() => {
            setCurrentStreamIndex((prev) => prev + 1)
          }, 2000)
        }
      }
    }

    const handleLoadStart = () => {
      setPlaybackError(false)
      setErrorMessage("")
      setIsLoading(true)
    }

    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("error", handleError)
    video.addEventListener("loadstart", handleLoadStart)

    // 清理函数
    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout)
      }
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("error", handleError)
      video.removeEventListener("loadstart", handleLoadStart)
    }
  }, [currentStream, currentStreamIndex, currentStreams])

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.error("Play error:", err)
        setPlaybackError(true)
        setErrorMessage("无法播放，可能需要用户交互")
      })
    }
  }

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
    }
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    try {
      if (!document.fullscreenElement) {
        // 进入全屏
        await containerRef.current.requestFullscreen()
      } else {
        // 退出全屏
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error("Fullscreen error:", error)
    }
  }

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
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

  if (!channel) {
    return (
      <div className="flex-1 relative h-full bg-gradient-to-br from-[#0f0f1a] via-[#151525] to-[#0a0a15]">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <Play className="w-12 h-12 text-white/20" />
          </div>
          <p className="text-white/40 text-lg text-center">选择一个频道并点击播放开始观看</p>
        </div>
        <div className="absolute top-4 right-4 flex items-center gap-1.5 text-white/50 text-sm">
          <Clock className="w-4 h-4" />
          <span>{currentTime}</span>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 relative h-full overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {channel.logo && !logoError ? (
          <Image
            src={channel.logo}
            alt=""
            fill
            className="object-cover scale-150 blur-3xl opacity-30"
            unoptimized
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-blue-900/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a15] via-[#0a0a15]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a15]/50 to-transparent" />
      </div>

      {/* Time */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 text-white/60 text-sm z-10">
        <Clock className="w-4 h-4" />
        <span>{currentTime}</span>
      </div>

      {/* Video Player */}
      {currentStream && (
        <div className="absolute inset-0 w-full h-full">
          <video
            ref={videoRef}
            className={cn(
              "absolute inset-0 w-full h-full transition-opacity duration-500",
              isPlaying && !playbackError ? "opacity-100" : "opacity-0",
            )}
            playsInline
            muted
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
          {/* Loading Indicator */}
          {isLoading && !playbackError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
                <p className="text-white/60 text-sm">
                  正在加载流源 {currentStreamIndex + 1}/{currentStreams.length}...
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <div className="mb-6">
          <span className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">正在播放</span>
          <h2 className="text-2xl font-bold text-white mt-1 text-balance">{channel.name}</h2>
          <p className="text-white/60 text-sm mt-2">直播 • {channel.categories[0] || "娱乐"}</p>
          <p className="text-white/40 text-sm mt-2 line-clamp-2">
            正在播放 {channel.name} 的最新节目，为您提供 24/7 优质内容。
          </p>
        </div>

        {/* Controls */}
        {currentStream && (
          <div className="flex items-center gap-3">
            {!playbackError && !isLoading ? (
              <>
                <Button
                  onClick={isPlaying ? handlePause : handlePlay}
                  size="lg"
                  className="bg-white text-black hover:bg-white/90 rounded-full px-6"
                  disabled={isLoading}
                >
                  {isPlaying ? "暂停" : "播放"}
                </Button>
                <Button
                  onClick={toggleMute}
                  variant="outline"
                  size="icon"
                  className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white"
                  disabled={isLoading}
                >
                  {videoRef.current?.muted ? "🔇" : "🔊"}
                </Button>
                <Button
                  onClick={toggleFullscreen}
                  variant="outline"
                  size="icon"
                  className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white"
                  disabled={isLoading}
                  title={isFullscreen ? "退出全屏" : "全屏"}
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </Button>
              </>
            ) : isLoading ? (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>正在加载流源 {currentStreamIndex + 1}/{currentStreams.length}...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-start gap-2 text-amber-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">无法在浏览器中播放此流</p>
                    {errorMessage && (
                      <p className="text-amber-300/70 text-xs mt-1">{errorMessage}</p>
                    )}
                    {currentStream && (
                      <p className="text-white/40 text-xs mt-1 break-all">
                        流地址: {currentStream.url.substring(0, 60)}...
                      </p>
                    )}
                    {currentStreams.length > 1 && (
                      <p className="text-white/40 text-xs mt-1">
                        正在尝试 {currentStreamIndex + 1}/{currentStreams.length} 个流源
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {currentStreams.length > currentStreamIndex + 1 && (
                    <Button
                      onClick={tryNextStream}
                      variant="outline"
                      className="border-white/20 bg-white/5 hover:bg-white/10 text-white flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      尝试下一个流源
                    </Button>
                  )}
                  <Button
                    onClick={copyStreamUrl}
                    variant="outline"
                    className="border-white/20 bg-white/5 hover:bg-white/10 text-white flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {copied ? "已复制!" : "复制流地址"}
                  </Button>
                </div>
                <div className="text-white/30 text-xs mt-2 p-2 bg-white/5 rounded">
                  <p className="font-medium mb-1">提示：</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>已使用 hls.js 播放器，支持 HLS (.m3u8) 流</li>
                    <li>部分 IPTV 流需要特定的 HTTP headers（Referer/User-Agent）</li>
                    <li>如果仍然无法播放，可能是 CORS 限制，建议使用 VLC、PotPlayer、IINA 等播放器</li>
                    <li>复制流地址后，可在外部播放器中打开</li>
                    <li>错误代码 4 通常表示：CORS 限制、网络连接失败或流格式不支持</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {!currentStream && (
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>此频道暂无可用流</span>
          </div>
        )}
      </div>
    </div>
  )
}
