import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""

  if (!q || q.length < 2) {
    return NextResponse.json({ courses: [], lessons: [] })
  }

  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6) // max 6 tokens

  // Build OR conditions for each term across multiple fields
  const courseWhere = {
    status: "PUBLISHED" as const,
    OR: terms.flatMap((t) => [
      { title: { contains: t, mode: "insensitive" as const } },
      { shortDescription: { contains: t, mode: "insensitive" as const } },
      { description: { contains: t, mode: "insensitive" as const } },
      { category: { name: { contains: t, mode: "insensitive" as const } } },
    ]),
  }

  const lessonWhere = {
    status: "PUBLISHED" as const,
    course: { status: "PUBLISHED" as const },
    OR: terms.flatMap((t) => [
      { title: { contains: t, mode: "insensitive" as const } },
      { description: { contains: t, mode: "insensitive" as const } },
      { searchKeywords: { contains: t, mode: "insensitive" as const } },
    ]),
  }

  const [rawCourses, rawLessons] = await Promise.all([
    db.course.findMany({
      where: courseWhere,
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        coverImage: true,
        bannerImage: true,
        trailColorRgb: true,
        badgeLabel: true,
        workloadHours: true,
        category: { select: { name: true, slug: true } },
        _count: { select: { lessons: true } },
      },
      take: 20,
    }),
    db.lesson.findMany({
      where: lessonWhere,
      select: {
        id: true,
        title: true,
        description: true,
        isFree: true,
        videoThumbnailUrl: true,
        thumbnail: true,
        durationSeconds: true,
        videoDurationSeconds: true,
        videoProviderId: true,
        searchKeywords: true,
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            trailColorRgb: true,
            badgeLabel: true,
          },
        },
      },
      take: 30,
    }),
  ])

  // Score results: exact title match scores highest, then starts-with, then contains
  const scoreText = (text: string | null | undefined, q: string, terms: string[]) => {
    if (!text) return 0
    const t = text.toLowerCase()
    const qLow = q.toLowerCase()
    if (t === qLow) return 100
    if (t.startsWith(qLow)) return 80
    if (t.includes(qLow)) return 60
    // partial: count how many terms match
    const matched = terms.filter((term) => t.includes(term)).length
    return (matched / terms.length) * 40
  }

  const scoredCourses = rawCourses
    .map((c) => ({
      ...c,
      _score:
        scoreText(c.title, q, terms) * 2 +
        scoreText(c.shortDescription, q, terms) +
        scoreText(c.category?.name, q, terms) * 0.5,
    }))
    .sort((a, b) => b._score - a._score)

  const scoredLessons = rawLessons
    .map((l) => ({
      ...l,
      _score:
        scoreText(l.title, q, terms) * 2 +
        scoreText(l.description, q, terms) +
        scoreText(l.searchKeywords, q, terms) * 1.5 +
        scoreText(l.course.title, q, terms) * 0.5,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 15)

  return NextResponse.json({
    query: q,
    courses: scoredCourses.slice(0, 10),
    lessons: scoredLessons,
  })
}
