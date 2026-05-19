/**
 * Application-wide constants.
 * For server-only values, prefer process.env directly.
 * Values here serve as documented defaults/fallbacks.
 */

export const BUNNY_CDN_HOST =
  process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME ??
  process.env.BUNNY_CDN_HOSTNAME ??
  "vz-38444944-922.b-cdn.net"
