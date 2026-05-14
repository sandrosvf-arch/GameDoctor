/**
 * GET    /api/admin/trilhas/[id]  — busca trilha com módulos e aulas
 * PATCH  /api/admin/trilhas/[id]  — atualiza título, descrição, status
 * DELETE /api/admin/trilhas/[id]  — exclui trilha (cascade)
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const course = await db.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true, title: true, description: true,
              durationSeconds: true, videoDurationSeconds: true,
              videoProvider: true, videoProviderId: true,
              videoEmbedUrl: true, videoThumbnailUrl: true, thumbnail: true,
              isFree: true, status: true, order: true,
            },
          },
        },
      },
    },
  })

  if (!course) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  // Incluir aulas sem módulo (moduleId = null) num módulo virtual
  const directLessons = await db.lesson.findMany({
    where: { courseId: id, moduleId: null },
    orderBy: { order: "asc" },
    select: {
      id: true, title: true, description: true,
      durationSeconds: true, videoDurationSeconds: true,
      videoProvider: true, videoProviderId: true,
      videoEmbedUrl: true, videoThumbnailUrl: true, thumbnail: true,
      isFree: true, status: true, order: true,
    },
  })

  const response = {
    ...course,
    modules: [
      ...(directLessons.length > 0
        ? [{ id: "__direct__", title: "", lessons: directLessons }]
        : []),
      ...course.modules,
    ],
  }

  return NextResponse.json(response)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const { title, slug, shortDescription, description, status, coverImage } = body as Record<string, string>

  const course = await db.course.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(shortDescription !== undefined && { shortDescription }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status: status as never }),
      ...(coverImage !== undefined && { coverImage }),
    },
  })

  return NextResponse.json(course)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await db.course.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
