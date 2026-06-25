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

export function getCommunityActiveBanWhere(userId?: string) {
  return {
    ...(userId ? { userId } : {}),
    status: "ACTIVE" as const,
    OR: [
      { endsAt: null },
      { endsAt: { gt: new Date() } },
    ],
  }
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

export function formatCommunityDate(date: string | Date | null | undefined) {
  if (!date) return "Sem data"

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return "Sem data"
  }

  const now = new Date()
  const diffMs = now.getTime() - parsedDate.getTime()

  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const time = parsedDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  const isSameYear = parsedDate.getFullYear() === now.getFullYear()

  if (diffSeconds < 30) {
    return "agora"
  }

  if (diffMinutes < 60) {
    return `há ${diffMinutes} min`
  }

  if (diffHours < 24) {
    return `há ${diffHours} h`
  }

  if (diffDays === 1) {
    return `ontem às ${time}`
  }

  if (diffDays <= 7) {
    return `há ${diffDays} dias`
  }

  if (isSameYear) {
    return parsedDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    }).replace(".", "")
  }

  return parsedDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
