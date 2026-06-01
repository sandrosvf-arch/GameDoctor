"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Search, BookOpen, Play, Clock, Tag, Loader2, X, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface CourseResult {
  id: string
  title: string
  slug: string
  shortDescription: string | null
  coverImage: string | null
  bannerImage: string | null
  trailColorRgb: string | null
  badgeLabel: string | null
  workloadHours: number | null
  category: { name: string; slug: string } | null
  _count: { lessons: number }
}

interface LessonResult {
  id: string
  title: string
  description: string | null
  isFree: boolean
  videoThumbnailUrl: string | null
  thumbnail: string | null
  durationSeconds: number | null
  videoDurationSeconds: number | null
  videoProviderId: string | null
  course: { id: string; title: string; slug: string; trailColorRgb: string | null; badgeLabel: string | null }
}

function formatDur(secs: number | null | undefined) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  return m > 0 ? `${m}min` : `${secs}s`
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text
  const terms = query.trim().split(/\s+/).filter(Boolean)
  const regex = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi")
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-primary/25 text-primary rounded-sm px-0.5 not-italic">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export default function BuscaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get("q") ?? ""

  const [query, setQuery] = useState(initialQ)
  const [debouncedQ, setDebouncedQ] = useState(initialQ)
  const [courses, setCourses] = useState<CourseResult[]>([])
  const [lessons, setLessons] = useState<LessonResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setCourses([])
      setLessons([])
      setSearched(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      setCourses(data.courses ?? [])
      setLessons(data.lessons ?? [])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce: run search 400ms after user stops typing
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQ(query), 400)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  useEffect(() => {
    doSearch(debouncedQ)
    if (debouncedQ.trim()) {
      const params = new URLSearchParams({ q: debouncedQ.trim() })
      router.replace(`/busca?${params}`, { scroll: false })
    }
  }, [debouncedQ, doSearch, router])

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
    if (initialQ) doSearch(initialQ)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const total = courses.length + lessons.length

  return (
    <div className="min-h-screen bg-background">
      {/* Search hero bar */}
      <div className="border-b border-border/40 bg-card/30 py-8">
        <div className="container max-w-3xl space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
          <h1 className="text-2xl font-bold">Buscar</h1>

          {/* Search input with animated border */}
          <div className={cn("p-[1.5px] rounded-full", loading ? "search-spinning" : "search-static")}>
            <div className="relative rounded-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60 pointer-events-none" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="O que você quer consertar?"
                className="h-12 w-full rounded-full bg-background pl-12 pr-10 text-base placeholder:text-muted-foreground/40 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setDebouncedQ(""); inputRef.current?.focus() }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {searched && !loading && (
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? `Nenhum resultado para "${debouncedQ}"`
                : `${total} resultado${total !== 1 ? "s" : ""} para "${debouncedQ}"`}
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="container max-w-5xl py-8 space-y-10">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && searched && total === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-semibold">Nenhum resultado encontrado</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Tente buscar por outro termo ou navegue pelos nossos{" "}
              <Link href="/cursos" className="text-primary hover:underline">cursos</Link>.
            </p>
          </div>
        )}

        {!loading && !searched && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Search className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-muted-foreground">Digite pelo menos 2 caracteres para buscar</p>
          </div>
        )}

        {/* Courses */}
        {!loading && courses.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground/60">
              <BookOpen className="h-4 w-4" />
              Trilhas / Cursos ({courses.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => {
                const accent = course.trailColorRgb ? `rgb(${course.trailColorRgb})` : "#06b6d4"
                const thumb = course.bannerImage ?? course.coverImage
                return (
                  <Link
                    key={course.id}
                    href={`/trilhas/${course.slug}`}
                    className="group rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden hover:border-zinc-700 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden bg-zinc-900">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={course.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}08)` }} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      {course.badgeLabel && (
                        <span
                          className="absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
                          style={{ backgroundColor: accent, color: "#000" }}
                        >
                          {course.badgeLabel}
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-1.5">
                      <p className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">
                        {highlight(course.title, debouncedQ)}
                      </p>
                      {course.shortDescription && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {highlight(course.shortDescription, debouncedQ)}
                        </p>
                      )}
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground/70">
                        {course.category && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {course.category.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {course._count.lessons} aula{course._count.lessons !== 1 ? "s" : ""}
                        </span>
                        {course.workloadHours && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {course.workloadHours}h
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Lessons */}
        {!loading && lessons.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground/60">
              <Play className="h-4 w-4" />
              Aulas ({lessons.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {lessons.map((lesson) => {
                const accent = lesson.course.trailColorRgb ? `rgb(${lesson.course.trailColorRgb})` : "#06b6d4"
                const thumb = lesson.videoThumbnailUrl ?? lesson.thumbnail
                const dur = formatDur(lesson.videoDurationSeconds ?? lesson.durationSeconds)
                const href = lesson.videoProviderId
                  ? `/aula/bunny/${lesson.videoProviderId}`
                  : `/aula/${lesson.id}`
                return (
                  <Link
                    key={lesson.id}
                    href={href}
                    className="group rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden hover:border-zinc-700 transition-all"
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative aspect-video overflow-hidden bg-zinc-900"
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={lesson.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}08)` }}>
                          <Play className="h-8 w-8 text-zinc-600" />
                        </div>
                      )}
                      {dur && (
                        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white/80">{dur}</span>
                      )}
                      {lesson.isFree && (
                        <span className="absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-emerald-500/90 text-white">
                          Grátis
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-1">
                      <p className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {highlight(lesson.title, debouncedQ)}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 truncate">{lesson.course.title}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
