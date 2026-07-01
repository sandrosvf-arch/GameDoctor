/**
 * Bunny Stream helpers
 *
 * Required env vars:
 *   BUNNY_LIBRARY_ID       – ID numérico da biblioteca (ex: 123456)
 *   BUNNY_STREAM_API_KEY   – API Key da biblioteca (aba API no painel)
 *   BUNNY_CDN_HOSTNAME     – Pull zone hostname (ex: gamedoctor.b-cdn.net)
 *   BUNNY_TOKEN_AUTH_KEY   – Token secret para signed URLs (Token Authentication no pull zone)
 */

import crypto from "node:crypto"

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

/** URL direta do MP4 (fallback para transcrição / download) */
export function bunnyMp4Url(videoId: string, resolution: "480p" | "720p" | "1080p" = "720p"): string {
  return `https://${CDN_HOST}/${videoId}/play_${resolution}.mp4`
}

/**
 * URL MP4 com Token Authentication (Bunny CDN signed URL).
 * Necessário quando a pull zone tem "Token Authentication" habilitado.
 * Token = base64url(MD5(tokenKey + path + expires))
 *
 * @param expiresInSeconds tempo de validade (padrão: 4h — suficiente para o AssemblyAI baixar)
 */
export function bunnySignedMp4Url(
  videoId: string,
  resolution: "480p" | "720p" = "480p",
  expiresInSeconds = 4 * 3600,
): string {
  const tokenKey = process.env.BUNNY_TOKEN_AUTH_KEY ?? ""
  const path = `/${videoId}/play_${resolution}.mp4`
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds

  if (!tokenKey) {
    // Token auth não configurado — retorna URL sem assinatura
    return `https://${CDN_HOST}${path}`
  }

  const token = crypto
    .createHash("md5")
    .update(tokenKey + path + expires)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")

  return `https://${CDN_HOST}${path}?token=${token}&expires=${expires}`
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
