/**
 * Video Provider Abstraction Layer
 *
 * Architecture: register adapters for each provider at startup.
 * Switch providers without changing application code.
 *
 * Supported providers: VIMEO | MUX | CLOUDFLARE | BUNNY | WISTIA | AWS_S3 | EXTERNAL
 */

export type VideoProviderName =
  | "VIMEO"
  | "MUX"
  | "CLOUDFLARE"
  | "BUNNY"
  | "WISTIA"
  | "AWS_S3"
  | "EXTERNAL"

export interface VideoPlaybackInfo {
  /** URL to embed/stream (HLS or iframe src) */
  playbackUrl: string
  /** Embed iframe src, if provider uses iframes */
  embedUrl?: string
  /** Thumbnail/poster image URL */
  thumbnailUrl?: string
  /** Total duration in seconds */
  durationSeconds?: number
  /** Whether this is a limited preview */
  isPreview: boolean
  /** Preview limit in seconds (null = full access) */
  previewDurationSeconds?: number | null
}

export interface VideoAccessOptions {
  userId?: string
  /** Serve only the preview segment */
  isPreview?: boolean
  previewDurationSeconds?: number
  /** Domain to restrict embed to */
  allowedDomain?: string
}

export interface VideoProviderAdapter {
  /**
   * Returns playback info for a video.
   * For providers with signed URLs, generates a fresh token.
   */
  getPlaybackInfo(
    videoId: string,
    options?: VideoAccessOptions
  ): Promise<VideoPlaybackInfo>

  /**
   * Generates a signed/temporary URL for direct playback.
   * Optional — implement only if the provider supports it.
   */
  getSignedUrl?(videoId: string, expiresInSeconds?: number): Promise<string>

  /**
   * Generates a per-user embed token.
   * Optional — implement only if the provider supports it (e.g. Vimeo OTT).
   */
  getEmbedToken?(videoId: string, userId?: string): Promise<string>
}

const registry = new Map<VideoProviderName, VideoProviderAdapter>()

export function registerVideoProvider(
  name: VideoProviderName,
  adapter: VideoProviderAdapter
): void {
  registry.set(name, adapter)
}

export function getVideoProvider(name: VideoProviderName): VideoProviderAdapter {
  const adapter = registry.get(name)
  if (!adapter) {
    throw new Error(
      `Video provider "${name}" is not registered. ` +
        `Register it in src/lib/video/providers/${name.toLowerCase()}/index.ts`
    )
  }
  return adapter
}

export async function getVideoPlaybackInfo(
  provider: VideoProviderName,
  videoId: string,
  options?: VideoAccessOptions
): Promise<VideoPlaybackInfo> {
  return getVideoProvider(provider).getPlaybackInfo(videoId, options)
}
