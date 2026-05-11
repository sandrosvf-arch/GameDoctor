import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
      { protocol: "https", hostname: "vumbnail.com" },
      { protocol: "https", hostname: "stream.mux.com" },
      { protocol: "https", hostname: "image.mux.com" },
      { protocol: "https", hostname: "*.bunnycdn.com" },
      { protocol: "https", hostname: "*.b-cdn.net" },
      { protocol: "https", hostname: "*.cloudflarestream.com" },
      { protocol: "https", hostname: "*.r2.dev" },
    ],
  },
}

export default nextConfig
