/**
 * PATCH  /api/admin/trilhas/[id]/aulas/[lessonId]  — edita aula
 * DELETE /api/admin/trilhas/[id]/aulas/[lessonId]  — remove aula
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { lessonId } = await params
  const body = await request.json().catch(() => ({}))

  const { title, description, bunnyVideoId, isFree, order, status } = body as {
    title?: string; description?: string; bunnyVideoId?: string
    isFree?: boolean; order?: number; status?: string
  }

  const videoFields = bunnyVideoId ? bunnyVideoFields(bunnyVideoId) : {}

  const lesson = await db.lesson.update({
    where: { id: lessonId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(isFree !== undefined && { isFree }),
      ...(order !== undefined && { order }),
      ...(status !== undefined && { status: status as never }),
      ...videoFields,
    },
  })

  return NextResponse.json(lesson)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { lessonId } = await params
  await db.lesson.delete({ where: { id: lessonId } })
  return NextResponse.json({ ok: true })
}
