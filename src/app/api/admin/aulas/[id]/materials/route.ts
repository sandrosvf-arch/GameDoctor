/**
 * GET  /api/admin/aulas/[id]/materials — list materials for a lesson
 * POST /api/admin/aulas/[id]/materials — create a material for a lesson
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const materials = await db.material.findMany({
    where: { lessonId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, fileUrl: true, externalUrl: true, type: true, isFree: true },
  })

  return NextResponse.json(materials)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const lesson = await db.lesson.findUnique({ where: { id }, select: { courseId: true } })
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const { title, externalUrl, fileUrl, type } = body as {
    title?: string
    externalUrl?: string
    fileUrl?: string
    type?: string
  }

  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 })

  const material = await db.material.create({
    data: {
      lessonId: id,
      courseId: lesson.courseId,
      title: title.trim(),
      externalUrl: externalUrl || null,
      fileUrl: fileUrl || null,
      type: (type as never) ?? "OTHER",
      status: "ACTIVE",
    },
    select: { id: true, title: true, fileUrl: true, externalUrl: true, type: true, isFree: true },
  })

  return NextResponse.json(material)
}
