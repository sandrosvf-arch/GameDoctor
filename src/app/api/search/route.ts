import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  classifySearchMatch,
  compareRankedSearchResults,
  normalizeSearchText,
  scoreSearchText,
  type SearchMatchType,
} from "@/lib/search-ranking"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1") || 1)
  const pageSize = Math.min(30, Math.max(6, Number(req.nextUrl.searchParams.get("pageSize") ?? "18") || 18))

  if (!q || q.length < 2) {
    return NextResponse.json({ courses: [], lessons: [], pagination: { page: 1, pageSize, total: 0, hasMore: false } })
  }

  const terms = normalizeSearchText(q)
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
      { courseCategories: { some: { category: { name: { contains: t, mode: "insensitive" as const } } } } },
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
        description: true,
        coverImage: true,
        bannerImage: true,
        trailColorRgb: true,
        badgeLabel: true,
        workloadHours: true,
        category: { select: { name: true, slug: true } },
        courseCategories: {
          select: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        _count: { select: { lessons: true } },
      },
      take: 200,
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
            coverImage: true,
            bannerImage: true,
          },
        },
      },
      take: 200,
    }),
  ])

  const scoredCourses = rawCourses
    .map((c) => ({
      ...c,
      matchType: classifySearchMatch(q, [c.title, c.shortDescription, c.description]),
      score:
        scoreSearchText(c.title, q, terms) * 2 +
        scoreSearchText(c.shortDescription, q, terms) +
        scoreSearchText(c.category?.name, q, terms) * 0.5 +
        Math.max(0, ...c.courseCategories.map((entry) => scoreSearchText(entry.category.name, q, terms) * 0.5)),
    }))

  const scoredLessons = rawLessons
    .map((l) => ({
      ...l,
      matchType: classifySearchMatch(q, [l.title, l.searchKeywords, l.description]),
      score:
        scoreSearchText(l.title, q, terms) * 2 +
        scoreSearchText(l.description, q, terms) +
        scoreSearchText(l.searchKeywords, q, terms) * 1.5 +
        scoreSearchText(l.course.title, q, terms) * 0.5,
    }))

  type RankedResult =
    | { kind: "course"; id: string; matchType: SearchMatchType; score: number }
    | { kind: "lesson"; id: string; matchType: SearchMatchType; score: number }

  const ranked: RankedResult[] = [
    ...scoredCourses.map((course) => ({ kind: "course" as const, id: course.id, matchType: course.matchType, score: course.score })),
    ...scoredLessons.map((lesson) => ({ kind: "lesson" as const, id: lesson.id, matchType: lesson.matchType, score: lesson.score })),
  ].sort(compareRankedSearchResults)

  const pageResults = ranked.slice((page - 1) * pageSize, page * pageSize)
  const courseIds = new Set(pageResults.filter((result) => result.kind === "course").map((result) => result.id))
  const lessonIds = new Set(pageResults.filter((result) => result.kind === "lesson").map((result) => result.id))
  const order = new Map(pageResults.map((result, index) => [`${result.kind}:${result.id}`, index]))
  const courses = scoredCourses
    .filter((course) => courseIds.has(course.id))
    .sort((left, right) => (order.get(`course:${left.id}`) ?? 0) - (order.get(`course:${right.id}`) ?? 0))
    .map(({ score: _score, ...course }) => course)
  const lessons = scoredLessons
    .filter((lesson) => lessonIds.has(lesson.id))
    .sort((left, right) => (order.get(`lesson:${left.id}`) ?? 0) - (order.get(`lesson:${right.id}`) ?? 0))
    .map(({ score: _score, ...lesson }) => lesson)

  return NextResponse.json({
    query: q,
    courses,
    lessons,
    pagination: {
      page,
      pageSize,
      total: ranked.length,
      hasMore: page * pageSize < ranked.length,
    },
  })
}
