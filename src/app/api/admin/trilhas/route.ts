/**
 * GET  /api/admin/trilhas        — lista todas as trilhas (courses) com módulos e aulas
 * POST /api/admin/trilhas        — cria nova trilha
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
  const r = Number(m[1]); const g = Number(m[2]); const b = Number(m[3])
  if (![r, g, b].every(v => Number.isInteger(v) && v >= 0 && v <= 255)) return undefined
  return `rgb(${r}, ${g}, ${b})`
}

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
      courseCategories: {
        include: {
          category: {
            select: { id: true, name: true, slug: true, parentId: true },
          },
        },
      },
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
  const { title, slug, shortDescription, status = "DRAFT", coverImage, trailColorRgb, badgeTextColorRgb, badgeLabel, selectedCategoryIds } = body as {
    title?: string; slug?: string; shortDescription?: string; status?: string
    coverImage?: string; trailColorRgb?: string; badgeTextColorRgb?: string; badgeLabel?: string
    selectedCategoryIds?: string[]
  }

  if (!title?.trim()) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 })

  const normalizedTrailColor = normalizeRgbInput(trailColorRgb)
  const normalizedBadgeTextColor = normalizeRgbInput(badgeTextColorRgb)

  if (normalizedTrailColor === undefined && trailColorRgb !== undefined)
    return NextResponse.json({ error: "Cor da trilha inválida. Use rgb(r, g, b)." }, { status: 400 })
  if (normalizedBadgeTextColor === undefined && badgeTextColorRgb !== undefined)
    return NextResponse.json({ error: "Cor do texto do badge inválida. Use rgb(r, g, b)." }, { status: 400 })

  const finalSlug = slug?.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  // Assign displayOrder = max existing + 1 so the new trail appears last
  const agg = await db.course.aggregate({ _max: { displayOrder: true } })
  const nextOrder = (agg._max.displayOrder ?? -1) + 1
  const categoryIds = Array.isArray(selectedCategoryIds)
    ? Array.from(new Set(selectedCategoryIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)))
    : []

  const course = await db.course.create({
    data: {
      title: title.trim(),
      slug: finalSlug,
      shortDescription: shortDescription?.trim(),
      status: status as never,
      displayOrder: nextOrder,
      ...(coverImage?.trim() && { coverImage: coverImage.trim() }),
      ...(normalizedTrailColor != null && { trailColorRgb: normalizedTrailColor }),
      ...(normalizedBadgeTextColor != null && { badgeTextColorRgb: normalizedBadgeTextColor }),
      ...(badgeLabel?.trim() && { badgeLabel: badgeLabel.trim() }),
      ...(categoryIds.length > 0 && {
        courseCategories: {
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
      }),
    },
    include: {
      courseCategories: {
        include: {
          category: {
            select: { id: true, name: true, slug: true, parentId: true },
          },
        },
      },
    },
  })

  return NextResponse.json(course, { status: 201 })
}
