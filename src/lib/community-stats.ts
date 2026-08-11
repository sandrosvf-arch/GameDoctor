import { db } from "@/lib/db"

export interface CommunityAuthorStats {
  topicsCount: number
  postsCount: number
  likesReceivedCount: number
  score: number
  badgeLabel: string
}

export function getCommunityBadgeLabel(score: number) {
  if (score >= 1500) return "Referência técnica"
  if (score >= 1000) return "Mentor da comunidade"
  if (score >= 700) return "Membro especialista"
  if (score >= 450) return "Membro avançado"
  if (score >= 300) return "Colaborador experiente"
  if (score >= 180) return "Colaborador recorrente"
  if (score >= 100) return "Colaborador ativo"
  if (score >= 50) return "Participante ativo"
  if (score >= 15) return "Participante"
  return "Novo membro"
}

export function emptyCommunityAuthorStats(): CommunityAuthorStats {
  return {
    topicsCount: 0,
    postsCount: 0,
    likesReceivedCount: 0,
    score: 0,
    badgeLabel: getCommunityBadgeLabel(0),
  }
}

export async function getCommunityStatsByUserIds(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)))
  const stats = new Map<string, CommunityAuthorStats>()

  for (const userId of uniqueUserIds) {
    stats.set(userId, emptyCommunityAuthorStats())
  }

  if (uniqueUserIds.length === 0) return stats

  const [topics, posts, likes] = await Promise.all([
    db.communityTopic.groupBy({
      by: ["authorId"],
      where: { authorId: { in: uniqueUserIds }, status: "APPROVED" },
      _count: { _all: true },
    }),
    db.communityPost.groupBy({
      by: ["authorId"],
      where: { authorId: { in: uniqueUserIds }, status: "APPROVED" },
      _count: { _all: true },
    }),
    db.communityPost.groupBy({
      by: ["authorId"],
      where: { authorId: { in: uniqueUserIds }, status: "APPROVED" },
      _sum: { likesCount: true },
    }),
  ])

  for (const item of topics) {
    const current = stats.get(item.authorId) ?? emptyCommunityAuthorStats()
    current.topicsCount = item._count._all
    stats.set(item.authorId, current)
  }

  for (const item of posts) {
    const current = stats.get(item.authorId) ?? emptyCommunityAuthorStats()
    current.postsCount = item._count._all
    stats.set(item.authorId, current)
  }

  for (const item of likes) {
    const current = stats.get(item.authorId) ?? emptyCommunityAuthorStats()
    current.likesReceivedCount = item._sum.likesCount ?? 0
    stats.set(item.authorId, current)
  }

  for (const [userId, current] of stats) {
    const score = current.topicsCount * 3 + current.postsCount * 2 + current.likesReceivedCount
    stats.set(userId, {
      ...current,
      score,
      badgeLabel: getCommunityBadgeLabel(score),
    })
  }

  return stats
}