import { sanitizeTrustedHtml } from "@/lib/security-input"

export function slugifyHelp(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function sanitizeHelpHtml(html: string) {
  return sanitizeTrustedHtml(html)
}

export function stripHelpHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function buildExcerptFromHtml(html: string, maxLength = 180) {
  const text = stripHelpHtml(html)
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trimEnd()}...`
}
