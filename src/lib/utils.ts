import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function brightenHexColor(color: string, amount = 0.28) {
  const match = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
  if (!match) return color

  const blendAmount = Math.min(1, Math.max(0, amount))
  const channels = match.slice(1).map((channel) => {
    const value = parseInt(channel, 16)
    return Math.round(value + (255 - value) * blendAmount)
  })

  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
}
