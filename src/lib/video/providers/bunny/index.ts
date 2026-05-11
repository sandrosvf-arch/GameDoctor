/**
 * Bunny Stream Video Provider
 *
 * Docs: https://docs.bunny.net/reference/stream-api
 *
 * Setup:
 *   BUNNY_STREAM_API_KEY=...
 *   BUNNY_STREAM_LIBRARY_ID=...
 *   BUNNY_STREAM_PULL_ZONE=...   (e.g. vz-xxxxx.b-cdn.net)
 *   BUNNY_STREAM_SIGNING_KEY=... (for signed URLs)
 *
 * TODO: implement Bunny Stream signed URLs
 */
import type { VideoProviderAdapter, VideoPlaybackInfo, VideoAccessOptions } from "@/lib/video"

export const bunnyProvider: VideoProviderAdapter = {
  async getPlaybackInfo(
    videoId: string,
    options?: VideoAccessOptions
  ): Promise<VideoPlaybackInfo> {
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID!
    const pullZone = process.env.BUNNY_STREAM_PULL_ZONE!

    // TODO: For DRM/signed URLs, add token query param
    const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`
    const playbackUrl = `https://${pullZone}/${videoId}/playlist.m3u8`
    const thumbnailUrl = `https://${pullZone}/${videoId}/thumbnail.jpg`

    return {
      playbackUrl,
      embedUrl,
      thumbnailUrl,
      isPreview: options?.isPreview ?? false,
      previewDurationSeconds: options?.previewDurationSeconds ?? null,
    }
  },

  async getSignedUrl(videoId: string, expiresInSeconds = 3600): Promise<string> {
    // TODO: implement Bunny CDN token authentication
    // https://support.bunny.net/hc/en-us/articles/360016055099
    throw new Error("Bunny Stream signed URL not implemented")
  },
}
