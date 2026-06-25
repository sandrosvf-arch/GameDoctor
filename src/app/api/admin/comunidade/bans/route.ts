import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCommunityActiveBanWhere } from "@/lib/community"

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "EDITOR"
}

async function requireAdmin() {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) return null
  return session
}

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const userId = typeof body?.userId === "string" ? body.userId : ""
  const reason = typeof body?.reason === "string" ? body.reason.trim() : ""
  const durationDays = Number(body?.durationDays)

  if (!userId) {
    return NextResponse.json({ error: "Usuario invalido." }, { status: 400 })
  }

  const existing = await db.communityBan.findFirst({
    where: getCommunityActiveBanWhere(userId),
    orderBy: [{ createdAt: "desc" }],
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({ error: "Este usuario ja esta banido da comunidade." }, { status: 409 })
  }

  const endsAt =
    Number.isFinite(durationDays) && durationDays > 0
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null

  const ban = await db.communityBan.create({
    data: {
      userId,
      createdById: session.user.id,
      reason: reason || null,
      endsAt,
      status: "ACTIVE",
    },
  })

  await db.communityModerationAction.create({
    data: {
      moderatorId: session.user.id,
      targetUserId: userId,
      actionType: "BAN_USER",
      reason: reason || null,
    },
  }).catch(() => {})

  return NextResponse.json(ban, { status: 201 })
}
