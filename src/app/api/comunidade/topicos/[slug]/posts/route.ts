import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasActivePlanAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { getCommunityActiveBanWhere, isCommunityWriterBanned } from "@/lib/community"

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "EDITOR"
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  const { slug } = await params

  const topic = await db.communityTopic.findUnique({
    where: { slug },
    select: { id: true, status: true },
  })

  if (!topic || topic.status !== "APPROVED") {
    return NextResponse.json({ error: "Topico nao encontrado." }, { status: 404 })
  }

  const canViewReplies = isAdminRole(session?.user?.role)
    || (session?.user?.id ? await hasActivePlanAccess(session.user.id) : false)

  if (!canViewReplies) {
    return NextResponse.json(
      {
        error: "As respostas da comunidade estão disponíveis apenas para assinantes.",
        requiresPlan: true,
        upgradeUrl: "/planos",
      },
      { status: 403 }
    )
  }

  const posts = await db.communityPost.findMany({
    where: {
      topicId: topic.id,
      parentPostId: null,
      status: "APPROVED",
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  })

  return NextResponse.json(posts)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { slug } = await params
  const hasRepliesAccess = isAdminRole(session.user.role) || await hasActivePlanAccess(session.user.id)

  const topic = await db.communityTopic.findUnique({
    where: { slug },
    select: {
      id: true,
      forumId: true,
      authorId: true,
      isLocked: true,
      status: true,
      forum: {
        select: {
          replyApprovalRequired: true,
        },
      },
    },
  })

  if (!topic || topic.status !== "APPROVED") {
    return NextResponse.json({ error: "Topico nao encontrado." }, { status: 404 })
  }

  if (!hasRepliesAccess) {
    return NextResponse.json(
      {
        error: "Você precisa de um plano ativo para responder na comunidade.",
        requiresPlan: true,
        upgradeUrl: "/planos",
      },
      { status: 403 }
    )
  }

  if (topic.isLocked) {
    return NextResponse.json({ error: "Este topico esta fechado para novas respostas." }, { status: 400 })
  }

  const activeBan = await db.communityBan.findFirst({
    where: getCommunityActiveBanWhere(session.user.id),
    orderBy: [{ createdAt: "desc" }],
    select: {
      status: true,
      endsAt: true,
      reason: true,
    },
  })

  if (
    activeBan &&
    isCommunityWriterBanned({
      status: activeBan.status,
      endsAt: activeBan.endsAt,
    })
  ) {
    return NextResponse.json(
      { error: activeBan.reason || "Sua conta esta bloqueada para publicar na comunidade." },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => null)
  const content = typeof body?.content === "string" ? body.content.trim() : ""
  const attachments = Array.isArray(body?.attachments) ? body.attachments : []

  if (content.replace(/<[^>]+>/g, "").trim().length < 6) {
    return NextResponse.json({ error: "Escreva uma resposta mais completa." }, { status: 400 })
  }

  const normalizedAttachments = attachments
    .filter((attachment: unknown) => typeof (attachment as { url?: unknown })?.url === "string")
    .slice(0, 6)
    .map((attachment: {
      fileName?: string
      url: string
      mimeType?: string
      sizeBytes?: number | string
    }) => ({
      fileName:
        typeof attachment.fileName === "string" && attachment.fileName.trim()
          ? attachment.fileName.trim()
          : "anexo",
      fileUrl: attachment.url.trim(),
      mimeType: typeof attachment.mimeType === "string" ? attachment.mimeType : null,
      sizeBytes:
        Number.isFinite(Number(attachment.sizeBytes)) && Number(attachment.sizeBytes) > 0
          ? Number(attachment.sizeBytes)
          : null,
    }))

  const autoApprove = isAdminRole(session.user.role) || !topic.forum.replyApprovalRequired

  const post = await db.communityPost.create({
    data: {
      topicId: topic.id,
      authorId: session.user.id,
      content,
      status: autoApprove ? "APPROVED" : "PENDING",
      approvedAt: autoApprove ? new Date() : null,
      approvedById: autoApprove ? session.user.id : null,
      attachments: normalizedAttachments.length
        ? {
            create: normalizedAttachments.map((attachment: {
              fileName: string
              fileUrl: string
              mimeType: string | null
              sizeBytes: number | null
            }) => ({
              uploadedById: session.user.id,
              fileName: attachment.fileName,
              fileUrl: attachment.fileUrl,
              mimeType: attachment.mimeType,
              sizeBytes: attachment.sizeBytes,
            })),
          }
        : undefined,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      status: true,
      attachments: {
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          mimeType: true,
          sizeBytes: true,
        },
      },
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  })

  if (autoApprove) {
    await db.communityTopic.update({
      where: { id: topic.id },
      data: {
        repliesCount: {
          increment: 1,
        },
        lastReplyAt: new Date(),
      },
    })

    await db.communityModerationAction.create({
      data: {
        moderatorId: session.user.id,
        targetUserId: session.user.id,
        forumId: topic.forumId,
        topicId: topic.id,
        postId: post.id,
        actionType: "APPROVE_POST",
        reason: "Resposta aprovada automaticamente.",
      },
    }).catch(() => {})
  }

  if (!autoApprove) {
    return NextResponse.json(
      {
        pending: true,
        message: "Resposta enviada para aprovacao da equipe.",
      },
      { status: 201 }
    )
  }

  return NextResponse.json(
    {
      pending: false,
      post,
    },
    { status: 201 }
  )
}
