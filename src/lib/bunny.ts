/**
 * Bunny Stream helpers
 *
 * Required env vars:
 *   BUNNY_LIBRARY_ID       – ID numérico da biblioteca (ex: 123456)
 *   BUNNY_STREAM_API_KEY   – API Key da biblioteca (aba API no painel)
 *   BUNNY_CDN_HOSTNAME     – Pull zone hostname (ex: gamedoctor.b-cdn.net)
 *   BUNNY_TOKEN_AUTH_KEY   – Token secret para signed URLs (opcional)
 */

const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID ?? ""
const CDN_HOST   = process.env.BUNNY_CDN_HOSTNAME ?? ""

/** URL do player iframe embed do Bunny Stream */
export function bunnyEmbedUrl(videoId: string): string {
  return `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`
}

/** URL HLS para player nativo (playlist.m3u8) */
export function bunnyPlaybackUrl(videoId: string): string {
  return `https://${CDN_HOST}/${videoId}/playlist.m3u8`
}

/** URL do thumbnail gerado automaticamente pelo Bunny */
export function bunnyThumbnailUrl(videoId: string): string {
  return `https://${CDN_HOST}/${videoId}/thumbnail.jpg`
}

/** Retorna todos os campos de vídeo prontos para salvar no Lesson */
export function bunnyVideoFields(videoId: string) {
  return {
    videoProvider:    "BUNNY"        as const,
    videoProviderId:  videoId,
    videoEmbedUrl:    bunnyEmbedUrl(videoId),
    videoPlaybackUrl: bunnyPlaybackUrl(videoId),
    videoThumbnailUrl: bunnyThumbnailUrl(videoId),
  }
}
