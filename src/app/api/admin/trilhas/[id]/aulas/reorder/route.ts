/**
 * POST /api/admin/trilhas/[id]/aulas/reorder
 * Body: [{ id: string, order: number }, ...]
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: trilhaId } = await params
  const items = await request.json().catch(() => []) as { id: string; order: number }[]
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 })
  }

  await db.$transaction(
    items.map(({ id: lessonId, order }) =>
      db.lesson.update({ where: { id: lessonId, courseId: trilhaId }, data: { order } })
    )
  )

  return NextResponse.json({ ok: true })
}
