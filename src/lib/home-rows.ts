import { db } from "@/lib/db"

const BUNNY_CDN = "vz-38444944-922.b-cdn.net"

const slugToRowId: Record<string, string> = {
  "inicio-da-jornada": "primeiros",
  "playstation-5":     "ps5",
  "xbox-series-xs":    "xbox",
  "nintendo-switch":   "switch",
  "fundamentos-de-eletronica": "basics",
}

const rowPlatformBadge: Record<string, string> = {
  primeiros: "GRÁTIS",
  ps5:       "PS5",
  xbox:      "XBOX",
  switch:    "SWITCH",
  basics:    "ELETRONICA",
}

const rowBrandColorDefaults: Record<string, string> = {
  ps5:       "#0070d1",
  xbox:      "#107c10",
  switch:    "#e4000f",
  primeiros: "#f59e0b",
  basics:    "#7c3aed",
}

function parseToHex(value?: string | null): string | null {
  if (!value) return null
  const raw = value.trim()
  // Accept "rgb(r, g, b)" or "r, g, b"
  const m = raw.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
    ?? raw.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/)
  if (!m) return null
  const r = Number(m[1]); const g = Number(m[2]); const b = Number(m[3])
  if ([r, g, b].some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

function getDefaultBrandColor(rowId: string, rowTitle?: string): string {
  if (rowBrandColorDefaults[rowId]) return rowBrandColorDefaults[rowId]
  const probe = `${rowId} ${rowTitle ?? ""}`.toLowerCase()
  if (probe.includes("xbox")) return rowBrandColorDefaults.xbox
  if (probe.includes("playstation") || probe.includes("ps5")) return rowBrandColorDefaults.ps5
  if (probe.includes("switch")) return rowBrandColorDefaults.switch
  if (probe.includes("jornada") || probe.includes("inicio")) return rowBrandColorDefaults.primeiros
  if (probe.includes("fundamentos") || probe.includes("eletronica")) return rowBrandColorDefaults.basics
  return "#00cfff"
}

export interface HomeCardDto {
  id: string
  title: string
  duration: string
  isFree: boolean
  href: string
  thumbnail: string
}

export interface HomeRowDto {
  id: string
  title: string
  platformBadge: string
  courseSlug: string
  /** Hex color for the row accent (#rrggbb) */
  brandColor: string
  badgeTextColor: string
  badgeLabel: string | null
  cards: HomeCardDto[]
}

export async function fetchHomeRows(
  skip: number,
  take: number,
): Promise<{ rows: HomeRowDto[]; total: number }> {
  const [dbCourses, total] = await Promise.all([
    db.course.findMany({
      where: { status: "PUBLISHED" },
      select: {
        slug: true,
        title: true,
        trailColorRgb: true,
        badgeTextColorRgb: true,
        badgeLabel: true,
        lessons: {
          where: { moduleId: null },
          orderBy: { order: "asc" },
          select: {
            id: true, title: true, description: true,
            durationSeconds: true, videoDurationSeconds: true,
            videoProviderId: true, videoThumbnailUrl: true, thumbnail: true,
            isFree: true,
          },
        },
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true, title: true, description: true,
                durationSeconds: true, videoDurationSeconds: true,
                videoProviderId: true, videoThumbnailUrl: true, thumbnail: true,
                isFree: true,
              },
            },
          },
        },
      },
      orderBy: { displayOrder: "asc" },
      skip,
      take,
    }),
    db.course.count({ where: { status: "PUBLISHED" } }),
  ])

  const rows: HomeRowDto[] = dbCourses.map((course) => {
    const rowId = slugToRowId[course.slug] ?? course.slug
    const brandColor =
      parseToHex(course.trailColorRgb) ?? getDefaultBrandColor(rowId, course.title)
    const badgeTextColor = parseToHex(course.badgeTextColorRgb) ?? "#ffffff"

    const allLessons = [
      ...course.lessons,
      ...course.modules.flatMap((m) => m.lessons),
    ]

    const cards: HomeCardDto[] = allLessons.map((l) => {
      const dur = l.videoDurationSeconds ?? l.durationSeconds
      const durStr = dur
        ? dur >= 3600
          ? `${Math.floor(dur / 3600)}h ${Math.floor((dur % 3600) / 60)}min`
          : `${Math.floor(dur / 60)} min`
        : ""
      const href = l.videoProviderId
        ? `/aula/bunny/${l.videoProviderId}?titulo=${encodeURIComponent(l.title)}${
            l.description ? `&legenda=${encodeURIComponent(l.description)}` : ""
          }`
        : `/aula/${l.id}`
      const thumbnail =
        l.thumbnail ??
        (l.videoProviderId ? `https://${BUNNY_CDN}/${l.videoProviderId}/thumbnail.jpg` : null) ??
        l.videoThumbnailUrl ??
        "/thumbs/t01.jpg"

      return { id: l.id, title: l.title, duration: durStr, isFree: l.isFree, href, thumbnail }
    })

    return {
      id: rowId,
      title: course.title,
      platformBadge: rowPlatformBadge[rowId] ?? "",
      courseSlug: course.slug,
      brandColor,
      badgeTextColor,
      badgeLabel: course.badgeLabel ?? null,
      cards,
    }
  })

  return { rows, total }
}
