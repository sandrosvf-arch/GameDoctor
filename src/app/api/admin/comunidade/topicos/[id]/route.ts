import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "EDITOR"
}

async function requireAdmin() {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) return null
  return session
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = typeof body?.action === "string" ? body.action : ""
  const reason = typeof body?.reason === "string" ? body.reason.trim() : null

  const topic = await db.communityTopic.findUnique({
    where: { id },
    select: {
      id: true,
      forumId: true,
      authorId: true,
      isPinned: true,
      isLocked: true,
    },
  })

  if (!topic) {
    return NextResponse.json({ error: "Topico nao encontrado." }, { status: 404 })
  }

  if (action === "approve") {
    const updated = await db.communityTopic.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: session.user.id,
      },
    })

    await db.communityModerationAction.create({
      data: {
        moderatorId: session.user.id,
        targetUserId: topic.authorId,
        forumId: topic.forumId,
        topicId: topic.id,
        actionType: "APPROVE_TOPIC",
        reason,
      },
    }).catch(() => {})

    return NextResponse.json(updated)
  }

  if (action === "reject") {
    const updated = await db.communityTopic.update({
      where: { id },
      data: {
        status: "REJECTED",
      },
    })

    await db.communityModerationAction.create({
      data: {
        moderatorId: session.user.id,
        targetUserId: topic.authorId,
        forumId: topic.forumId,
        topicId: topic.id,
        actionType: "REJECT_TOPIC",
        reason,
      },
    }).catch(() => {})

    return NextResponse.json(updated)
  }

  if (action === "togglePin") {
    const nextPinned = !topic.isPinned
    const updated = await db.communityTopic.update({
      where: { id },
      data: {
        isPinned: nextPinned,
      },
    })

    await db.communityModerationAction.create({
      data: {
        moderatorId: session.user.id,
        targetUserId: topic.authorId,
        forumId: topic.forumId,
        topicId: topic.id,
        actionType: nextPinned ? "PIN_TOPIC" : "UNPIN_TOPIC",
        reason,
      },
    }).catch(() => {})

    return NextResponse.json(updated)
  }

  if (action === "toggleLock") {
    const nextLocked = !topic.isLocked
    const updated = await db.communityTopic.update({
      where: { id },
      data: {
        isLocked: nextLocked,
      },
    })

    await db.communityModerationAction.create({
      data: {
        moderatorId: session.user.id,
        targetUserId: topic.authorId,
        forumId: topic.forumId,
        topicId: topic.id,
        actionType: nextLocked ? "LOCK_TOPIC" : "UNLOCK_TOPIC",
        reason,
      },
    }).catch(() => {})

    return NextResponse.json(updated)
  }

  if (action === "delete") {
    await db.communityTopic.delete({
      where: { id },
    })

    await db.communityModerationAction.create({
      data: {
        moderatorId: session.user.id,
        targetUserId: topic.authorId,
        forumId: topic.forumId,
        topicId: topic.id,
        actionType: "DELETE_TOPIC",
        reason,
      },
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Acao invalida." }, { status: 400 })
}
