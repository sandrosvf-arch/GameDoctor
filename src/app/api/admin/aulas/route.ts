/**
 * GET /api/admin/aulas — lista todas as aulas com vídeo Bunny Stream
 */
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function GET(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "30") || 30))
  const search = searchParams.get("search")?.trim() ?? ""
  const trailId = searchParams.get("trailId")?.trim() ?? "all"
  const status = searchParams.get("status")?.trim() ?? "all"

  const where: Prisma.LessonWhereInput = {
    videoProviderId: { not: null },
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { course: { title: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(trailId !== "all" ? { courseId: trailId } : {}),
    ...(status !== "all" ? { status: status as "PUBLISHED" | "DRAFT" | "HIDDEN" } : {}),
  }

  const [total, lessons, trails] = await Promise.all([
    db.lesson.count({ where }),
    db.lesson.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ course: { title: "asc" } }, { order: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        searchKeywords: true,
        videoProviderId: true,
        videoThumbnailUrl: true,
        thumbnail: true,
        isFree: true,
        status: true,
        order: true,
        videoDurationSeconds: true,
        durationSeconds: true,
        course: { select: { id: true, title: true, slug: true, trailColorRgb: true } },
        module: { select: { id: true, title: true } },
      },
    }),
    db.course.findMany({
      where: {
        lessons: {
          some: {
            videoProviderId: { not: null },
          },
        },
      },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ])

  return NextResponse.json({
    lessons,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    trails,
  })
}
