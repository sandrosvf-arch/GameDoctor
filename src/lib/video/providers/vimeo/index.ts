/**
 * Vimeo Video Provider
 *
 * Docs: https://developer.vimeo.com/
 *
 * Setup:
 *   VIMEO_ACCESS_TOKEN=...  (bearer token with "video" scope)
 *
 * TODO: implement Vimeo API calls
 */
import type { VideoProviderAdapter, VideoPlaybackInfo, VideoAccessOptions } from "@/lib/video"

export const vimeoProvider: VideoProviderAdapter = {
  async getPlaybackInfo(
    videoId: string,
    options?: VideoAccessOptions
  ): Promise<VideoPlaybackInfo> {
    // TODO: Call Vimeo API to get embed URL
    // For domain restriction, use Vimeo privacy settings (embed domain whitelist)
    // For preview, limit via player parameter: #t=0s&duration=180s

    const embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=0&color=00dfdf&title=0&byline=0&portrait=0`

    return {
      playbackUrl: embedUrl,
      embedUrl,
      thumbnailUrl: undefined, // TODO: fetch from Vimeo API
      isPreview: options?.isPreview ?? false,
      previewDurationSeconds: options?.previewDurationSeconds ?? null,
    }
  },

  async getEmbedToken(videoId: string, userId?: string): Promise<string> {
    // TODO: implement Vimeo OTT token generation if using Vimeo OTT
    throw new Error("Vimeo embed token not implemented")
  },
}
