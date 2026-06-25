export function slugifyCommunity(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

export function isCommunityWriterBanned(input: {
  status: "ACTIVE" | "REVOKED" | "EXPIRED"
  endsAt: Date | null
}) {
  if (input.status !== "ACTIVE") return false
  if (!input.endsAt) return true
  return input.endsAt.getTime() > Date.now()
}

export function getCommunityFirstName(name: string | null | undefined) {
  if (!name) return "Usuario"
  return name.trim().split(/\s+/)[0] || "Usuario"
}

export function getCommunityInitials(name: string | null | undefined) {
  if (!name) return "U"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U"
}
