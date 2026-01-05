import { NextRequest, NextResponse } from "next/server"

/**
 * CORS 代理 API 路由
 * 用于代理 IPTV 流请求，解决浏览器 CORS 限制
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  try {
    // 验证 URL
    const streamUrl = new URL(url)
    
    // 获取请求头
    const referer = searchParams.get("referer") || undefined
    const userAgent = searchParams.get("userAgent") || 
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

    // 构建请求头
    const headers: HeadersInit = {
      "User-Agent": userAgent,
    }
    
    if (referer) {
      headers["Referer"] = referer
    }

    // 代理请求
    const response = await fetch(streamUrl.toString(), {
      headers,
      // 不跟随重定向，让客户端处理
      redirect: "manual",
    })

    // 获取响应内容
    const contentType = response.headers.get("content-type") || "application/octet-stream"
    const content = await response.arrayBuffer()

    // 返回代理的响应
    return new NextResponse(content, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error: any) {
    console.error("Proxy error:", error)
    return NextResponse.json(
      { error: "Failed to proxy request", message: error.message },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
