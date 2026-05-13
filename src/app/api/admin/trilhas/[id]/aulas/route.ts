/**
 * GET  /api/admin/trilhas/[id]/aulas        — lista aulas da trilha
 * POST /api/admin/trilhas/[id]/aulas        — cria nova aula (com vídeo Bunny opcional)
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { bunnyVideoFields } from "@/lib/bunny"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const lessons = await db.lesson.findMany({
    where: { courseId: id },
    orderBy: { order: "asc" },
    select: {
      id: true, title: true, description: true,
      durationSeconds: true, videoDurationSeconds: true,
      videoProvider: true, videoProviderId: true,
      videoEmbedUrl: true, videoThumbnailUrl: true,
      isFree: true, status: true, order: true,
    },
  })

  return NextResponse.json(lessons)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: courseId } = await params
  const body = await request.json().catch(() => ({}))

  const { title, description, bunnyVideoId, isFree = false, order, thumbnail } = body as {
    title?: string; description?: string; bunnyVideoId?: string
    isFree?: boolean; order?: number; thumbnail?: string
  }

  if (!title?.trim()) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 })

  // Count existing lessons to auto-set order
  const count = await db.lesson.count({ where: { courseId } })

  const videoFields = bunnyVideoId ? bunnyVideoFields(bunnyVideoId) : {}

  const lesson = await db.lesson.create({
    data: {
      courseId,
      title: title.trim(),
      description: description?.trim(),
      isFree,
      order: order ?? count,
      status: "PUBLISHED",
      ...(thumbnail?.trim() && { thumbnail: thumbnail.trim() }),
      ...videoFields,
    },
  })

  return NextResponse.json(lesson, { status: 201 })
}
