/**
 * GET  /api/admin/trilhas        — lista todas as trilhas (courses) com módulos e aulas
 * POST /api/admin/trilhas        — cria nova trilha
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return null
  }
  return session
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const courses = await db.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true, title: true, description: true, durationSeconds: true,
              videoDurationSeconds: true, videoProvider: true, videoProviderId: true,
              videoEmbedUrl: true, videoThumbnailUrl: true, isFree: true,
              status: true, order: true,
            },
          },
        },
      },
      _count: { select: { lessons: true } },
    },
  })

  return NextResponse.json(courses)
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { title, slug, shortDescription, status = "DRAFT" } = body as {
    title?: string; slug?: string; shortDescription?: string; status?: string
  }

  if (!title?.trim()) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 })

  const finalSlug = slug?.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  const course = await db.course.create({
    data: { title: title.trim(), slug: finalSlug, shortDescription: shortDescription?.trim(), status: status as never },
  })

  return NextResponse.json(course, { status: 201 })
}
