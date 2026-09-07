import sanitizeHtml from "sanitize-html"

const HELP_ALLOWED_TAGS = [
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "ul",
]

export function sanitizeTrustedHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: HELP_ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      a: ["http", "https", "mailto"],
    },
    disallowedTagsMode: "discard",
  }).trim()
}

export function isTrustedUploadUrl(value: string) {
  const supabaseUrl = process.env.SUPABASE_URL?.trim()
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET ?? process.env.SUPABASE_DOWNLOADS_BUCKET)?.trim()
  if (!supabaseUrl || !bucket) return false

  try {
    const url = new URL(value.trim())
    const expectedOrigin = new URL(supabaseUrl).origin
    const expectedPath = `/storage/v1/object/public/${bucket}/`

    return url.protocol === "https:" && url.origin === expectedOrigin && url.pathname.startsWith(expectedPath)
  } catch {
    return false
  }
}
