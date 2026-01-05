"use client"

import { useState, useMemo, useCallback } from "react"
import useSWR from "swr"
import {
  fetchChannels,
  fetchStreams,
  buildStreamMap,
  type Channel,
  type Stream,
} from "@/lib/iptv"
import {
  validateStreams,
  exportValidationResults,
  type StreamValidationResult,
} from "@/lib/stream-validator"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, XCircle, Clock, Loader2, Download, AlertCircle } from "lucide-react"

export default function ValidatePage() {
  const [isValidating, setIsValidating] = useState(false)
  const [results, setResults] = useState<StreamValidationResult[]>([])
  const [progress, setProgress] = useState({ completed: 0, total: 0 })

  const swrConfig = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  }

  const { data: channels } = useSWR<Channel[]>("channels", fetchChannels, swrConfig)
  const { data: streams } = useSWR<Stream[]>("streams", fetchStreams, swrConfig)

  const streamMap = useMemo(() => {
    if (!streams || !channels) return new Map<string, Stream[]>()
    const channelIds = new Set(channels.map((ch) => ch.id))
    return buildStreamMap(streams, channelIds)
  }, [streams, channels])

  // 构建需要验证的流列表
  const streamsToValidate = useMemo(() => {
    if (!channels || !streamMap) return []
    const result: Array<{
      url: string
      channelId: string
      channelName: string
      userAgent?: string | null
      httpReferrer?: string | null
    }> = []

    channels.forEach((channel) => {
      const channelStreams = streamMap.get(channel.id)
      if (channelStreams && channelStreams.length > 0) {
        // 只验证第一个流源
        const stream = channelStreams[0]
        result.push({
          url: stream.url,
          channelId: channel.id,
          channelName: channel.name,
          userAgent: stream.user_agent,
          httpReferrer: stream.http_referrer,
        })
      }
    })

    return result
  }, [channels, streamMap])

  const handleValidate = useCallback(async () => {
    if (streamsToValidate.length === 0) return

    setIsValidating(true)
    setResults([])
    setProgress({ completed: 0, total: streamsToValidate.length })

    try {
      const validationResults = await validateStreams(streamsToValidate, {
        concurrency: 3, // 并发数
        timeout: 10000, // 10秒超时
        onProgress: (completed, total) => {
          setProgress({ completed, total })
        },
      })

      setResults(validationResults)
    } catch (error) {
      console.error("Validation error:", error)
    } finally {
      setIsValidating(false)
    }
  }, [streamsToValidate])

  const handleExport = useCallback(() => {
    if (results.length === 0) return

    const data = exportValidationResults(results)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stream-validation-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [results])

  const successCount = results.filter((r) => r.status === "success").length
  const failedCount = results.filter((r) => r.status !== "success").length

  return (
    <div className="min-h-screen bg-[#08080f] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">流地址验证工具</h1>
          <p className="text-white/60">
            批量测试 IPTV 流地址是否可用。共 {streamsToValidate.length} 个流需要验证。
          </p>
        </div>

        <Card className="p-6 bg-[#0d0d18]/60 border-white/5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Button
                onClick={handleValidate}
                disabled={isValidating || streamsToValidate.length === 0}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    验证中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    开始验证
                  </>
                )}
              </Button>
            </div>
            {results.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-white/60">
                  成功: <span className="text-green-400 font-semibold">{successCount}</span> | 失败:{" "}
                  <span className="text-red-400 font-semibold">{failedCount}</span>
                </div>
                <Button onClick={handleExport} variant="outline" className="border-white/20">
                  <Download className="w-4 h-4 mr-2" />
                  导出结果
                </Button>
              </div>
            )}
          </div>

          {isValidating && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-white/60 mb-2">
                <span>验证进度</span>
                <span>
                  {progress.completed} / {progress.total}
                </span>
              </div>
              <Progress value={(progress.completed / progress.total) * 100} className="h-2" />
            </div>
          )}
        </Card>

        {results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">验证结果</h2>
              <div className="text-sm text-white/60">
                显示: 全部 ({results.length}) | 成功 ({successCount}) | 失败 ({failedCount})
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {results.map((result, index) => (
                <Card
                  key={`${result.channelId}-${index}`}
                  className={`p-4 bg-[#0d0d18]/60 border-white/5 ${
                    result.status === "success" ? "border-green-500/30" : "border-red-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {result.status === "success" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : result.status === "timeout" ? (
                          <Clock className="w-5 h-5 text-yellow-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                        <span className="font-semibold text-white">{result.channelName}</span>
                        <span className="text-xs text-white/40">({result.channelId})</span>
                      </div>
                      <p className="text-sm text-white/60 break-all mb-1">{result.url}</p>
                      {result.error && (
                        <p className="text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {result.error}
                        </p>
                      )}
                      {result.responseTime && (
                        <p className="text-xs text-white/40 mt-1">
                          响应时间: {result.responseTime}ms
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          result.status === "success"
                            ? "bg-green-500/20 text-green-400"
                            : result.status === "timeout"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {result.status === "success"
                          ? "可用"
                          : result.status === "timeout"
                            ? "超时"
                            : result.status === "failed"
                              ? "失败"
                              : "错误"}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
