/**
 * 流地址验证工具
 * 用于测试 IPTV 流地址是否可用
 */

export interface StreamValidationResult {
  url: string
  channelId: string
  channelName: string
  status: "checking" | "success" | "failed" | "timeout" | "error"
  error?: string
  responseTime?: number
  testedAt: Date
}

/**
 * 测试单个流地址是否可用
 * 使用实际视频加载来验证播放能力
 */
export async function validateStream(
  url: string,
  options: {
    timeout?: number
    userAgent?: string
    referer?: string
  } = {},
): Promise<Omit<StreamValidationResult, "channelId" | "channelName" | "testedAt">> {
  const { timeout = 12000, userAgent, referer } = options
  const startTime = Date.now()

  // 服务端无法测试视频
  if (typeof window === "undefined") {
    return {
      url,
      status: "error",
      error: "服务端无法测试视频",
      responseTime: 0,
    }
  }

  // 优先使用实际视频加载测试（更准确）
  try {
    const videoTestResult = await testVideoPlayback(url, timeout, userAgent, referer)
    if (videoTestResult.success) {
      return {
        url,
        status: "success",
        responseTime: videoTestResult.responseTime,
      }
    }

    // 如果视频测试失败，尝试 HLS.js（仅对 .m3u8 文件）
    if (url.includes(".m3u8")) {
      try {
        const hlsTestResult = await testHlsStream(url, timeout, userAgent, referer)
        return {
          url,
          status: hlsTestResult.success ? "success" : "failed",
          error: hlsTestResult.error,
          responseTime: hlsTestResult.responseTime,
        }
      } catch (hlsError: any) {
        return {
          url,
          status: "failed",
          error: hlsError.message || "HLS 测试失败",
          responseTime: videoTestResult.responseTime,
        }
      }
    }

    // 视频测试失败
    return {
      url,
      status: "failed",
      error: videoTestResult.error || "无法加载视频",
      responseTime: videoTestResult.responseTime,
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    return {
      url,
      status: "error",
      error: error.message || "测试错误",
      responseTime,
    }
  }
}

/**
 * 使用 HTML5 video 元素测试实际视频播放能力
 */
async function testVideoPlayback(
  url: string,
  timeout: number,
  userAgent?: string,
  referer?: string,
): Promise<{ success: boolean; error?: string; responseTime: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const video = document.createElement("video")
    video.preload = "metadata" // 只加载元数据，不加载完整视频
    video.muted = true // 静音以避免自动播放限制
    video.playsInline = true

    // 设置超时
    const timeoutId = setTimeout(() => {
      cleanup()
      resolve({
        success: false,
        error: "视频加载超时",
        responseTime: Date.now() - startTime,
      })
    }, timeout)

    // 清理函数
    const cleanup = () => {
      clearTimeout(timeoutId)
      video.pause()
      video.src = ""
      video.load()
      video.remove()
    }

    // 成功事件：视频可以播放
    const onCanPlay = () => {
      cleanup()
      resolve({
        success: true,
        responseTime: Date.now() - startTime,
      })
    }

    // 成功事件：加载了足够的数据
    const onLoadedData = () => {
      cleanup()
      resolve({
        success: true,
        responseTime: Date.now() - startTime,
      })
    }

    // 错误事件
    const onError = (e: Event) => {
      cleanup()
      const error = video.error
      let errorMsg = "视频加载失败"
      
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMsg = "视频加载被中止"
            break
          case MediaError.MEDIA_ERR_NETWORK:
            errorMsg = "网络错误"
            break
          case MediaError.MEDIA_ERR_DECODE:
            errorMsg = "视频解码失败"
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMsg = "不支持的视频格式"
            break
          default:
            errorMsg = `视频错误 (${error.code})`
        }
      }

      resolve({
        success: false,
        error: errorMsg,
        responseTime: Date.now() - startTime,
      })
    }

    // 绑定事件
    video.addEventListener("canplay", onCanPlay, { once: true })
    video.addEventListener("canplaythrough", onCanPlay, { once: true })
    video.addEventListener("loadeddata", onLoadedData, { once: true })
    video.addEventListener("error", onError, { once: true })

    // 设置请求头（通过设置 video 属性）
    if (userAgent || referer) {
      // 注意：HTML5 video 元素无法直接设置请求头
      // 但可以通过 CORS 代理或使用 fetch 先验证
      // 这里先尝试直接加载，如果失败再尝试其他方法
    }

    // 开始加载视频
    video.src = url
    video.load()
  })
}

/**
 * 使用 HLS.js 测试 HLS 流
 */
async function testHlsStream(
  url: string,
  timeout: number,
  userAgent?: string,
  referer?: string,
): Promise<{ success: boolean; error?: string; responseTime: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const timeoutId = setTimeout(() => {
      resolve({
        success: false,
        error: "HLS 测试超时",
        responseTime: Date.now() - startTime,
      })
    }, timeout)

    // 动态导入 hls.js（避免在服务端执行）
    if (typeof window === "undefined") {
      clearTimeout(timeoutId)
      resolve({
        success: false,
        error: "服务端无法测试 HLS",
        responseTime: Date.now() - startTime,
      })
      return
    }

    import("hls.js").then((Hls) => {
      if (!Hls.default.isSupported()) {
        clearTimeout(timeoutId)
        resolve({
          success: false,
          error: "浏览器不支持 HLS",
          responseTime: Date.now() - startTime,
        })
        return
      }

      const hls = new Hls.default({
        xhrSetup: (xhr) => {
          if (userAgent) {
            xhr.setRequestHeader("User-Agent", userAgent)
          }
          if (referer) {
            xhr.setRequestHeader("Referer", referer)
          }
        },
      })

      hls.on(Hls.default.Events.MANIFEST_PARSED, () => {
        clearTimeout(timeoutId)
        hls.destroy()
        resolve({
          success: true,
          responseTime: Date.now() - startTime,
        })
      })

      hls.on(Hls.default.Events.ERROR, (event, data) => {
        if (data.fatal) {
          clearTimeout(timeoutId)
          hls.destroy()
          resolve({
            success: false,
            error: `HLS 错误: ${data.type}`,
            responseTime: Date.now() - startTime,
          })
        }
      })

      hls.loadSource(url)
    })
  })
}

/**
 * 批量验证流地址
 * 支持测试每个频道的多个流源，只要有一个成功就认为该频道可播放
 */
export async function validateStreams(
  streams: Array<{
    url: string
    channelId: string
    channelName: string
    userAgent?: string | null
    httpReferrer?: string | null
  }>,
  options: {
    concurrency?: number
    timeout?: number
    onProgress?: (completed: number, total: number) => void
    onChannelSuccess?: (channelId: string) => void // 实时回调：当频道测试成功时
    testMultipleStreams?: boolean // 是否测试多个流源
    streamsPerChannel?: Map<string, Array<{ url: string; userAgent?: string | null; httpReferrer?: string | null }>> // 每个频道的所有流源
  } = {},
): Promise<StreamValidationResult[]> {
  const { concurrency = 3, timeout = 12000, onProgress, onChannelSuccess, testMultipleStreams = false, streamsPerChannel } = options
  const results: StreamValidationResult[] = []
  
  // 如果启用多流源测试，按频道分组
  if (testMultipleStreams && streamsPerChannel) {
    const channelIds = Array.from(streamsPerChannel.keys())
    let completed = 0
    const totalChannels = channelIds.length

    // 创建并发执行队列（按频道）
    const workers: Promise<void>[] = []
    const queue = [...channelIds]

    for (let i = 0; i < concurrency; i++) {
      workers.push(
        (async () => {
          while (queue.length > 0) {
            const channelId = queue.shift()
            if (!channelId) break

            const channelStreams = streamsPerChannel.get(channelId) || []
            const channelInfo = streams.find((s) => s.channelId === channelId)
            
            if (!channelInfo) continue

            // 测试该频道的所有流源，只要有一个成功就认为可播放
            let channelSuccess = false
            let bestResult: StreamValidationResult | null = null

            for (const stream of channelStreams) {
              const result = await validateStream(stream.url, {
                timeout,
                userAgent: stream.userAgent || undefined,
                referer: stream.httpReferrer || undefined,
              })

              const validationResult: StreamValidationResult = {
                ...result,
                channelId,
                channelName: channelInfo.channelName,
                testedAt: new Date(),
              }

              results.push(validationResult)

              // 如果这个流源成功，标记频道为可播放
              if (result.status === "success") {
                if (!channelSuccess) {
                  // 第一次成功，实时回调
                  channelSuccess = true
                  onChannelSuccess?.(channelId)
                }
                if (!bestResult || (bestResult.status !== "success" && result.status === "success")) {
                  bestResult = validationResult
                }
                // 找到可播放的流源后，可以继续测试其他流源（用于统计），但已经知道频道可播放了
              } else if (!bestResult || bestResult.status === "error") {
                // 保留第一个结果或错误结果作为备选
                bestResult = validationResult
              }
            }

            completed++
            onProgress?.(completed, totalChannels)
          }
        })(),
      )
    }

    await Promise.all(workers)
  } else {
    // 原有逻辑：测试单个流源
    const queue = [...streams]
    let completed = 0

    const workers: Promise<void>[] = []

    for (let i = 0; i < concurrency; i++) {
      workers.push(
        (async () => {
          while (queue.length > 0) {
            const stream = queue.shift()
            if (!stream) break

            const result = await validateStream(stream.url, {
              timeout,
              userAgent: stream.userAgent || undefined,
              referer: stream.httpReferrer || undefined,
            })

            const validationResult: StreamValidationResult = {
              ...result,
              channelId: stream.channelId,
              channelName: stream.channelName,
              testedAt: new Date(),
            }

            results.push(validationResult)

            // 如果测试成功，实时回调
            if (result.status === "success") {
              onChannelSuccess?.(stream.channelId)
            }

            completed++
            onProgress?.(completed, streams.length)
          }
        })(),
      )
    }

    await Promise.all(workers)
  }

  // 如果测试了多个流源，按频道去重，只保留最佳结果
  if (testMultipleStreams && streamsPerChannel) {
    const channelResults = new Map<string, StreamValidationResult>()
    
    for (const result of results) {
      const existing = channelResults.get(result.channelId)
      if (!existing) {
        channelResults.set(result.channelId, result)
      } else if (result.status === "success" && existing.status !== "success") {
        // 优先保留成功的结果
        channelResults.set(result.channelId, result)
      }
    }

    return Array.from(channelResults.values()).sort((a, b) => {
      if (a.status === "success" && b.status !== "success") return -1
      if (a.status !== "success" && b.status === "success") return 1
      return a.channelName.localeCompare(b.channelName)
    })
  }

  return results.sort((a, b) => {
    // 按状态排序：success 在前，然后按 channelName
    if (a.status === "success" && b.status !== "success") return -1
    if (a.status !== "success" && b.status === "success") return 1
    return a.channelName.localeCompare(b.channelName)
  })
}

/**
 * 导出验证结果为 JSON
 */
export function exportValidationResults(results: StreamValidationResult[]): string {
  return JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      total: results.length,
      success: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status !== "success").length,
      results: results.map((r) => ({
        channelId: r.channelId,
        channelName: r.channelName,
        url: r.url,
        status: r.status,
        error: r.error,
        responseTime: r.responseTime,
        testedAt: r.testedAt.toISOString(),
      })),
    },
    null,
    2,
  )
}
