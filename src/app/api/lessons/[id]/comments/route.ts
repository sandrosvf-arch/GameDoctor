/**
 * GET  /api/lessons/[id]/comments  — list comments (public)
 * POST /api/lessons/[id]/comments  — add comment (requires auth)
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const comments = await db.comment.findMany({
    where: { lessonId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
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
    return NextResponse.json({ error: "Comentário muito curto" }, { status: 400 })
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: "Comentário muito longo" }, { status: 400 })
  }

  // Verify lesson exists
  const lesson = await db.lesson.findUnique({ where: { id }, select: { id: true } })
  if (!lesson) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  const comment = await db.comment.create({
    data: { lessonId: id, userId: session.user.id, content },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  })

  return NextResponse.json(comment, { status: 201 })
}
