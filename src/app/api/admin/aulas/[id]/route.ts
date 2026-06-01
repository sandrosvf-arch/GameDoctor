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

  const { title, description, searchKeywords, bunnyVideoId, isFree, status, thumbnail } = body as {
    title?: string
    description?: string
    searchKeywords?: string
    bunnyVideoId?: string
    isFree?: boolean
    status?: string
    thumbnail?: string
  }

  const videoFields = bunnyVideoId ? bunnyVideoFields(bunnyVideoId) : {}

  const lesson = await db.lesson.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(searchKeywords !== undefined && { searchKeywords: searchKeywords || null }),
      ...(isFree !== undefined && { isFree }),
      ...(status !== undefined && { status: status as never }),
      ...(thumbnail !== undefined && { thumbnail: thumbnail || null }),
      ...videoFields,
    },
  })

  return NextResponse.json(lesson)
}
