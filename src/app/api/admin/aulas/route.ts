/**
 * GET /api/admin/aulas — lista todas as aulas com vídeo Bunny Stream
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lessons = await db.lesson.findMany({
    where: { videoProviderId: { not: null } },
    orderBy: [{ course: { title: "asc" } }, { order: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
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
  })

  return NextResponse.json(lessons)
}
