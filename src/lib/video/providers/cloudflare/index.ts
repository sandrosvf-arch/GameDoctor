/**
 * Cloudflare Stream Video Provider
 *
 * Docs: https://developers.cloudflare.com/stream/
 *
 * Setup:
 *   CLOUDFLARE_ACCOUNT_ID=...
 *   CLOUDFLARE_API_TOKEN=...
 *   CLOUDFLARE_STREAM_SIGNING_KEY_ID=...  (for signed tokens)
 *   CLOUDFLARE_STREAM_SIGNING_KEY=...     (base64 encoded private key)
 *
 * TODO: implement Cloudflare Stream signed tokens
 */
import type { VideoProviderAdapter, VideoPlaybackInfo, VideoAccessOptions } from "@/lib/video"

export const cloudflareProvider: VideoProviderAdapter = {
  async getPlaybackInfo(
    videoId: string,
    options?: VideoAccessOptions
  ): Promise<VideoPlaybackInfo> {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!

    // TODO: For signed tokens, generate a token and append ?token=...
    const embedUrl = `https://iframe.cloudflarestream.com/${videoId}`
    const playbackUrl = `https://customer-${accountId}.cloudflarestream.com/${videoId}/manifest/video.m3u8`
    const thumbnailUrl = `https://customer-${accountId}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`

    return {
      playbackUrl,
      embedUrl,
      thumbnailUrl,
      isPreview: options?.isPreview ?? false,
      previewDurationSeconds: options?.previewDurationSeconds ?? null,
    }
  },

  async getSignedUrl(videoId: string, expiresInSeconds = 3600): Promise<string> {
    // TODO: implement Cloudflare Stream signed token
    // https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/
    throw new Error("Cloudflare Stream signed URL not implemented")
  },
}
