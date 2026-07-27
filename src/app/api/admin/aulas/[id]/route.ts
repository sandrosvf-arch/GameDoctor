/**
 * PATCH /api/admin/aulas/[id] — edita uma aula pelo ID direto
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
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const { title, description, searchKeywords, bunnyVideoId, isFree, status, thumbnail, releaseAfterDays: rawReleaseAfterDays } = body as {
    title?: string
    description?: string
    searchKeywords?: string
    bunnyVideoId?: string
    isFree?: boolean
    status?: string
    thumbnail?: string
    releaseAfterDays?: number
  }

  const videoFields = bunnyVideoId ? bunnyVideoFields(bunnyVideoId) : {}
  const releaseAfterDays = rawReleaseAfterDays === undefined ? undefined : Number(rawReleaseAfterDays)
  if (releaseAfterDays !== undefined && (!Number.isInteger(releaseAfterDays) || releaseAfterDays < 0 || releaseAfterDays > 3650)) {
    return NextResponse.json({ error: "O prazo de liberação deve estar entre 0 e 3650 dias." }, { status: 400 })
  }

  const lesson = await db.lesson.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(searchKeywords !== undefined && { searchKeywords: searchKeywords || null }),
      ...(isFree !== undefined && { isFree }),
      ...(releaseAfterDays !== undefined && { releaseAfterDays }),
      ...(status !== undefined && { status: status as never }),
      ...(thumbnail !== undefined && { thumbnail: thumbnail || null }),
      ...videoFields,
    },
  })

  return NextResponse.json(lesson)
}
