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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAdmin()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await params

  const activeBan = await db.communityBan.findFirst({
    where: getCommunityActiveBanWhere(userId),
    orderBy: [{ createdAt: "desc" }],
    select: { id: true },
  })

  if (!activeBan) {
    return NextResponse.json({ error: "Nenhum banimento ativo encontrado." }, { status: 404 })
  }

  const updated = await db.communityBan.update({
    where: { id: activeBan.id },
    data: {
      status: "REVOKED",
      revokedById: session.user.id,
    },
  })

  await db.communityModerationAction.create({
    data: {
      moderatorId: session.user.id,
      targetUserId: userId,
      actionType: "UNBAN_USER",
    },
  }).catch(() => {})

  return NextResponse.json(updated)
}
