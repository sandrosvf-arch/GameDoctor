/**
 * Mux Video Provider
 *
 * Docs: https://docs.mux.com/
 *
 * Setup:
 *   MUX_TOKEN_ID=...
 *   MUX_TOKEN_SECRET=...
 *   MUX_WEBHOOK_SECRET=...   (for webhook signature validation)
 *
 * TODO: implement Mux signed playback tokens
 */
import type { VideoProviderAdapter, VideoPlaybackInfo, VideoAccessOptions } from "@/lib/video"

export const muxProvider: VideoProviderAdapter = {
  async getPlaybackInfo(
    playbackId: string,
    options?: VideoAccessOptions
  ): Promise<VideoPlaybackInfo> {
    // TODO: For signed playback policies, generate a JWT token via Mux API
    // Mux uses playbackId (not videoId) for streaming

    const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8`
    const embedUrl = `https://stream.mux.com/${playbackId}.m3u8`
    const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg`

    return {
      playbackUrl,
      embedUrl,
      thumbnailUrl,
      isPreview: options?.isPreview ?? false,
      previewDurationSeconds: options?.previewDurationSeconds ?? null,
    }
  },

  async getSignedUrl(playbackId: string, expiresInSeconds = 3600): Promise<string> {
    // TODO: implement Mux signed URL using RS256 JWT
    // https://docs.mux.com/guides/secure-video-playback
    throw new Error("Mux signed URL not implemented")
  },
}
