import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { isCommunityWriterBanned, slugifyCommunity } from "@/lib/community"

const PAGE_SIZE = 20

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "EDITOR"
}

async function buildUniqueTopicSlug(base: string) {
  const rootBase = slugifyCommunity(base) || `topico-${Date.now()}`
  let candidate = rootBase

  let suffix = 1
  while (true) {
    const existing = await db.communityTopic.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })

    if (!existing) return candidate

    suffix += 1
    candidate = `${rootBase}-${suffix}`
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim() ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)

  const forum = await db.communityForum.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      topicApprovalRequired: true,
      replyApprovalRequired: true,
      status: true,
    },
  })

  if (!forum || forum.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forum nao encontrado." }, { status: 404 })
  }

  const where = {
    forumId: forum.id,
    status: "APPROVED" as const,
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { content: { contains: query, mode: "insensitive" as const } },
            { author: { name: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  }

  const [total, topics] = await Promise.all([
    db.communityTopic.count({ where }),
    db.communityTopic.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { lastReplyAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        repliesCount: true,
        viewsCount: true,
        isPinned: true,
        isLocked: true,
        createdAt: true,
        lastReplyAt: true,
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    }),
  ])

  return NextResponse.json({
    forum,
    items: topics,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  })
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
  const forum = await db.communityForum.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      topicApprovalRequired: true,
    },
  })

  if (!forum || forum.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forum nao encontrado." }, { status: 404 })
  }

  const activeBan = await db.communityBan.findFirst({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
    },
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
  const title = typeof body?.title === "string" ? body.title.trim() : ""
  const content = typeof body?.content === "string" ? body.content.trim() : ""

  if (title.length < 6) {
    return NextResponse.json({ error: "O titulo precisa ter pelo menos 6 caracteres." }, { status: 400 })
  }

  if (content.replace(/<[^>]+>/g, "").trim().length < 12) {
    return NextResponse.json({ error: "Escreva um conteudo mais completo para o topico." }, { status: 400 })
  }

  const autoApprove = isAdminRole(session.user.role) || !forum.topicApprovalRequired
  const topicSlug = await buildUniqueTopicSlug(title)

  const topic = await db.communityTopic.create({
    data: {
      forumId: forum.id,
      authorId: session.user.id,
      title,
      slug: topicSlug,
      content,
      status: autoApprove ? "APPROVED" : "PENDING",
      approvedAt: autoApprove ? new Date() : null,
      approvedById: autoApprove ? session.user.id : null,
      lastReplyAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      createdAt: true,
    },
  })

  if (autoApprove) {
    await db.communityModerationAction.create({
      data: {
        moderatorId: session.user.id,
        targetUserId: session.user.id,
        forumId: forum.id,
        topicId: topic.id,
        actionType: "APPROVE_TOPIC",
        reason: "Publicacao aprovada automaticamente.",
      },
    }).catch(() => {})
  }

  if (!autoApprove) {
    return NextResponse.json(
      {
        pending: true,
        message: "Topico enviado para aprovacao da equipe.",
      },
      { status: 201 }
    )
  }

  return NextResponse.json(
    {
      pending: false,
      topic,
    },
    { status: 201 }
  )
}
