import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

  return NextResponse.json(comments)
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
    return NextResponse.json({ error: "Comentario muito curto" }, { status: 400 })
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: "Comentario muito longo" }, { status: 400 })
  }

  const lesson = await db.lesson.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!lesson) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
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
        message: "Comentario enviado para aprovacao.",
      },
      { status: 201 }
    )
  }

  return NextResponse.json({ pending: false, comment }, { status: 201 })
}
