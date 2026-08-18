/**
 * PATCH  /api/admin/trilhas/[id]/aulas/[lessonId]  — edita aula
 * DELETE /api/admin/trilhas/[id]/aulas/[lessonId]  — remove aula
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { bunnyVideoFields, isBunnyVideoId } from "@/lib/bunny"

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

  const {
    title, description, bunnyVideoId, isFree, order, status, thumbnail,
    releaseAfterDays: rawReleaseAfterDays, previewEnabled,
    previewVideoProviderId: rawPreviewVideoProviderId,
  } = body as {
    title?: string
    description?: string
    bunnyVideoId?: string
    isFree?: boolean
    order?: number
    status?: string
    thumbnail?: string
    releaseAfterDays?: number
    previewEnabled?: boolean
    previewVideoProviderId?: string
  }

  const videoFields = bunnyVideoId ? bunnyVideoFields(bunnyVideoId) : {}
  const releaseAfterDays = rawReleaseAfterDays === undefined ? undefined : Number(rawReleaseAfterDays)

  if (releaseAfterDays !== undefined && (!Number.isInteger(releaseAfterDays) || releaseAfterDays < 0 || releaseAfterDays > 3650)) {
    return NextResponse.json({ error: "O prazo de liberação deve estar entre 0 e 3650 dias." }, { status: 400 })
  }

  const previewVideoProviderId = rawPreviewVideoProviderId === undefined
    ? undefined
    : typeof rawPreviewVideoProviderId === "string"
      ? rawPreviewVideoProviderId.trim()
      : null

  if (previewVideoProviderId === null || (previewVideoProviderId && !isBunnyVideoId(previewVideoProviderId))) {
    return NextResponse.json({ error: "O Bunny Video ID da prévia deve ser um UUID válido." }, { status: 400 })
  }

  const lesson = await db.lesson.update({
    where: { id: lessonId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(isFree !== undefined && { isFree }),
      ...(releaseAfterDays !== undefined && { releaseAfterDays }),
      ...(previewEnabled !== undefined && { previewEnabled }),
      ...(previewVideoProviderId !== undefined && { previewVideoProviderId: previewVideoProviderId || null }),
      ...(order !== undefined && { order }),
      ...(status !== undefined && { status: status as never }),
      ...(thumbnail !== undefined && { thumbnail: thumbnail || null }),
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
