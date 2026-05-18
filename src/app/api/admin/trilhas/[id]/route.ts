/**
 * GET    /api/admin/trilhas/[id]  — busca trilha com módulos e aulas
 * PATCH  /api/admin/trilhas/[id]  — atualiza título, descrição, status
 * DELETE /api/admin/trilhas/[id]  — exclui trilha (cascade)
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

function normalizeRgbInput(input: unknown): string | null | undefined {
  if (input === undefined) return undefined
  if (input === null) return null
  const raw = String(input).trim()
  if (!raw) return null

  const rgbRegex = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
  const plainRegex = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/
  const hexRegex = /^#([0-9a-fA-F]{6})$/

  const hexMatch = raw.match(hexRegex)
  if (hexMatch) {
    const hex = hexMatch[1]
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `rgb(${r}, ${g}, ${b})`
  }

  const m = raw.match(rgbRegex) ?? raw.match(plainRegex)
  if (!m) return undefined

  const r = Number(m[1])
  const g = Number(m[2])
  const b = Number(m[3])
  const valid = [r, g, b].every((v) => Number.isInteger(v) && v >= 0 && v <= 255)
  if (!valid) return undefined

  return `rgb(${r}, ${g}, ${b})`
}

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

  const { title, slug, shortDescription, description, status, coverImage, trailColorRgb, badgeTextColorRgb, badgeLabel } = body as Record<string, string>
  const normalizedTrailColor = normalizeRgbInput(trailColorRgb)
  const normalizedBadgeTextColor = normalizeRgbInput(badgeTextColorRgb)

  if (normalizedTrailColor === undefined && trailColorRgb !== undefined) {
    return NextResponse.json({ error: "Cor da trilha inválida. Use rgb(r, g, b)." }, { status: 400 })
  }
  if (normalizedBadgeTextColor === undefined && badgeTextColorRgb !== undefined) {
    return NextResponse.json({ error: "Cor do texto do badge inválida. Use rgb(r, g, b)." }, { status: 400 })
  }

  const course = await db.course.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(shortDescription !== undefined && { shortDescription }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status: status as never }),
      ...(coverImage !== undefined && { coverImage }),
      ...(normalizedTrailColor !== undefined && { trailColorRgb: normalizedTrailColor }),
      ...(normalizedBadgeTextColor !== undefined && { badgeTextColorRgb: normalizedBadgeTextColor }),
      ...(badgeLabel !== undefined && { badgeLabel: badgeLabel || null }),
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
