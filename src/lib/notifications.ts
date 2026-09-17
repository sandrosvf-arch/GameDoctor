import sanitizeHtml from "sanitize-html"

export function sanitizeNotificationBody(value: string, richText: boolean) {
  if (!richText) return value.trim()
  return sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "em", "ul", "ol", "li", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https"],
  }).trim()
}
