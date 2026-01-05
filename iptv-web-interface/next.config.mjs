/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 静态导出，适合 Cloudflare Pages
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  trailingSlash: true, // Cloudflare Pages 兼容性
}

export default nextConfig
