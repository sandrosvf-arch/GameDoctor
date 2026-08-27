import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { hasAccessToLesson } from "@/lib/access"

async function canAccessLessonComments(
  lessonId: string,
  userId: string | null,
  role?: string | null
) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true },
  })

  if (!lesson) {
    return { allowed: false, lesson: null }
  }

  const lessonAccess = await hasAccessToLesson(userId, lessonId, {
    isStaff: role === "ADMIN" || role === "EDITOR",
  })

  return {
    allowed: lessonAccess.hasAccess && !lessonAccess.isPreview && !lessonAccess.isReleaseLocked,
    lesson,
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id } = await params
  const access = await canAccessLessonComments(id, session?.user?.id ?? null, session?.user?.role)

  if (!access.lesson) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  const comments = await db.comment.findMany({
    where: {
      lessonId: id,
      parentId: null,
      status: "APPROVED",
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      replies: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  })

  if (!access.allowed) {
    const lockedMessage = session?.user?.id
      ? "Assine um plano para ver este comentário e participar da conversa."
      : "Entre para ver este comentário e participar da conversa."

    return NextResponse.json(
      comments.map((comment) => ({
        ...comment,
        content: lockedMessage,
        contentLocked: true,
        replies: comment.replies.map((reply) => ({
          ...reply,
          content: lockedMessage,
          contentLocked: true,
        })),
      }))
    )
  }

  return NextResponse.json(
    comments.map((comment) => ({
      ...comment,
      contentLocked: false,
      replies: comment.replies.map((reply) => ({
        ...reply,
        contentLocked: false,
      })),
    }))
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const content = typeof body?.content === "string" ? body.content.trim() : ""

  if (!content || content.length < 2) {
    return NextResponse.json({ error: "Comentário muito curto" }, { status: 400 })
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: "Comentário muito longo" }, { status: 400 })
  }

  const access = await canAccessLessonComments(id, session.user.id, session.user.role)

  if (!access.lesson) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  if (!access.allowed) {
    return NextResponse.json(
      { error: "Seu plano atual não permite comentar nesta aula." },
      { status: 403 }
    )
  }

  const shouldAutoApprove =
    session.user.role === "ADMIN" || session.user.role === "EDITOR"

  const comment = await db.comment.create({
    data: {
      lessonId: id,
      userId: session.user.id,
      content,
      status: shouldAutoApprove ? "APPROVED" : "PENDING",
      approvedAt: shouldAutoApprove ? new Date() : null,
      approvedBy: shouldAutoApprove ? session.user.id : null,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      status: true,
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      replies: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  })

  if (!shouldAutoApprove) {
    return NextResponse.json(
      {
        pending: true,
        message: "Comentário enviado para aprovação.",
      },
      { status: 201 }
    )
  }

  return NextResponse.json({ pending: false, comment }, { status: 201 })
}
