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

  const post = await db.communityPost.findUnique({
    where: { id },
    select: {
      id: true,
      topicId: true,
      authorId: true,
      status: true,
      topic: {
        select: {
          forumId: true,
        },
      },
    },
  })

  if (!post) {
    return NextResponse.json({ error: "Resposta nao encontrada." }, { status: 404 })
  }

  if (action === "approve") {
    const updated = await db.communityPost.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: session.user.id,
      },
    })

    if (post.status !== "APPROVED") {
      await db.communityTopic.update({
        where: { id: post.topicId },
        data: {
          repliesCount: {
            increment: 1,
          },
          lastReplyAt: new Date(),
        },
      })
    }

    await db.communityModerationAction.create({
      data: {
        moderatorId: session.user.id,
        targetUserId: post.authorId,
        forumId: post.topic.forumId,
        topicId: post.topicId,
        postId: post.id,
        actionType: "APPROVE_POST",
        reason,
      },
    }).catch(() => {})

    return NextResponse.json(updated)
  }

  if (action === "reject") {
    const updated = await db.communityPost.update({
      where: { id },
      data: {
        status: "REJECTED",
      },
    })

    await db.communityModerationAction.create({
      data: {
        moderatorId: session.user.id,
        targetUserId: post.authorId,
        forumId: post.topic.forumId,
        topicId: post.topicId,
        postId: post.id,
        actionType: "REJECT_POST",
        reason,
      },
    }).catch(() => {})

    return NextResponse.json(updated)
  }

  if (action === "delete") {
    await db.communityPost.delete({
      where: { id },
    })

    if (post.status === "APPROVED") {
      const topic = await db.communityTopic.findUnique({
        where: { id: post.topicId },
        select: { repliesCount: true },
      })

      if (topic) {
        await db.communityTopic.update({
          where: { id: post.topicId },
          data: {
            repliesCount: Math.max(0, topic.repliesCount - 1),
          },
        })
      }
    }

    await db.communityModerationAction.create({
      data: {
        moderatorId: session.user.id,
        targetUserId: post.authorId,
        forumId: post.topic.forumId,
        topicId: post.topicId,
        postId: post.id,
        actionType: "DELETE_POST",
        reason,
      },
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Acao invalida." }, { status: 400 })
}
