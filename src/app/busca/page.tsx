"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import type { ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Search, Play, Loader2, X, ArrowLeft } from "lucide-react"
import { BUNNY_CDN_HOST } from "@/lib/constants"
import { Header } from "@/components/layout/Header"

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
  courseCategories: { category: { id: string; name: string; slug: string } }[]
  _count: { lessons: number }
  matchType: "exact" | "related"
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
  course: { id: string; title: string; slug: string; trailColorRgb: string | null; badgeLabel: string | null; coverImage: string | null; bannerImage: string | null }
  matchType: "exact" | "related"
}

function accentToHex(value: string | null | undefined) {
  const raw = value?.trim()
  if (!raw) return "#06b6d4"
  if (raw.startsWith("#")) return raw
  const match = raw.match(/(?:rgb\(\s*)?(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*\))?/i)
  if (!match) return "#06b6d4"
  const [red, green, blue] = match.slice(1).map(Number)
  if ([red, green, blue].some((channel) => channel < 0 || channel > 255)) return "#06b6d4"
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
}

function SearchTrailCard({
  href,
  accent,
  thumbnail,
  badge,
  title,
  description,
}: {
  href: string
  accent: string
  thumbnail: string | null
  badge?: string | null
  title: ReactNode
  description?: ReactNode
}) {
  return (
    <Link href={href} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-card/80 shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-card hover:shadow-xl hover:shadow-black/20">
        <div className="relative aspect-video shrink-0 overflow-hidden bg-zinc-900">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover brightness-110 transition duration-500 group-hover:scale-105" />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}08)` }} />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {badge && (
            <span className="absolute top-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: accent, color: "#000" }}>
              {badge}
            </span>
          )}

          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
              <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
            </div>
          </div>
        </div>
        <div className="flex min-h-[142px] flex-1 flex-col p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">{title}</h3>
            <span className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5">-&gt;</span>
          </div>
          {description && <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </div>
      </article>
    </Link>
  )
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text
  const terms = query.trim().split(/\s+/).filter(Boolean)
  const regex = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi")
  const parts = text.split(regex)
  return parts.map((part, i) =>
    terms.some((term) => part.toLocaleLowerCase("pt-BR") === term.toLocaleLowerCase("pt-BR")) ? (
      <mark key={i} className="bg-primary/25 text-primary rounded-sm px-0.5 not-italic">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function mergeResults<T extends { id: string }>(current: T[], incoming: T[]) {
  const seen = new Set(current.map((item) => item.id))
  return [...current, ...incoming.filter((item) => !seen.has(item.id))]
}

export default function BuscaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get("q") ?? ""
  const suggestionRequested = searchParams.get("sugerir") === "1"

  const [query, setQuery] = useState(initialQ)
  const [debouncedQ, setDebouncedQ] = useState(initialQ)
  const [courses, setCourses] = useState<CourseResult[]>([])
  const [lessons, setLessons] = useState<LessonResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searched, setSearched] = useState(false)
  const [resultPage, setResultPage] = useState(1)
  const [resultTotal, setResultTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Suggestion form state
  const [showForm, setShowForm] = useState(suggestionRequested)
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", lesson: initialQ })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const doSearch = useCallback(async (q: string, nextPage = 1, append = false) => {
    if (!q.trim() || q.trim().length < 2) {
      setCourses([])
      setLessons([])
      setSearched(false)
      setResultPage(1)
      setResultTotal(0)
      setHasMore(false)
      return
    }
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const params = new URLSearchParams({ q: q.trim(), page: String(nextPage), pageSize: "18" })
      const res = await fetch(`/api/search?${params.toString()}`)
      const data = await res.json()
      const nextCourses = data.courses ?? []
      const nextLessons = data.lessons ?? []
      setCourses((current) => append ? mergeResults(current, nextCourses) : nextCourses)
      setLessons((current) => append ? mergeResults(current, nextLessons) : nextLessons)
      setResultPage(data.pagination?.page ?? nextPage)
      setResultTotal(data.pagination?.total ?? nextCourses.length + nextLessons.length)
      setHasMore(Boolean(data.pagination?.hasMore))
      setSearched(true)
    } finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }, [])

  // Sync query state when URL param changes (e.g. new search from Header)
  useEffect(() => {
    const urlQ = searchParams.get("q") ?? ""
    if (urlQ && urlQ !== query) {
      setQuery(urlQ)
      setDebouncedQ(urlQ)
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce: run search 400ms after user stops typing
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQ(query), 400)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  useEffect(() => {
    void doSearch(debouncedQ)
    if (debouncedQ.trim()) {
      const params = new URLSearchParams({ q: debouncedQ.trim() })
      router.replace(`/busca?${params}`, { scroll: false })
    }
  }, [debouncedQ, doSearch, router])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasMore || loading || loadingMore) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void doSearch(debouncedQ, resultPage + 1, true)
    }, { rootMargin: "300px" })
    observer.observe(target)
    return () => observer.disconnect()
  }, [debouncedQ, doSearch, hasMore, loading, loadingMore, resultPage])

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSuggest(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/sugestoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          lesson: formData.lesson || debouncedQ,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error ?? "Erro ao enviar. Tente novamente.")
      } else {
        setSubmitted(true)
      }
    } catch {
      setFormError("Erro de conexão. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  const total = resultTotal
  const exactCourses = courses.filter((course) => course.matchType === "exact")
  const exactLessons = lessons.filter((lesson) => lesson.matchType === "exact")
  const relatedCourses = courses.filter((course) => course.matchType === "related")
  const relatedLessons = lessons.filter((lesson) => lesson.matchType === "related")

  return (
    <div className="min-h-screen bg-1">
      <Header />
      {/* Page header — back link + result count */}
      <div className="border-b border-white/10 bg-transparent py-4">
        <div className="container max-w-7xl flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
          {searched && !loading && total > 0 && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{total}</span> conteúdo{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""} para &ldquo;{debouncedQ}&rdquo;
              </p>
            </>
          )}
          {searched && !loading && total === 0 && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <p className="text-sm text-muted-foreground">Nenhum resultado para &ldquo;{debouncedQ}&rdquo;</p>
            </>
          )}
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Results */}
      <div className="container max-w-7xl py-8 space-y-10">
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
              <Link href="/cursos" className="text-primary hover:underline">trilhas</Link>.
            </p>
          </div>
        )}

        {!loading && !searched && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Search className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-muted-foreground">Digite pelo menos 2 caracteres para buscar</p>
          </div>
        )}

        {!loading && (exactCourses.length > 0 || exactLessons.length > 0) && (
          <SearchResultGroup
            title="Resultados mais relevantes"
            description="Correspondências com o termo completo pesquisado."
            courses={exactCourses}
            lessons={exactLessons}
            query={debouncedQ}
          />
        )}

        {!loading && (relatedCourses.length > 0 || relatedLessons.length > 0) && (
          <SearchResultGroup
            title="Resultados relacionados"
            description="Conteúdos próximos encontrados pelas palavras da busca."
            courses={relatedCourses}
            lessons={relatedLessons}
            query={debouncedQ}
          />
        )}

        {searched && hasMore && <div ref={loadMoreRef} className="h-1" aria-hidden="true" />}
        {loadingMore && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando mais resultados...
          </div>
        )}

        {/* CTA — always visible after a search attempt */}
        {(searched || showForm || submitted) && (
          <div className="mt-6 border-t border-white/10 px-8 py-10 text-center space-y-4">
            <p className="text-lg font-semibold">Não encontrou o conteúdo que procura?</p>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Essa plataforma é viva! Subimos aulas novas toda semana. Qual aula você gostaria de ver por aqui?
            </p>

            {!showForm && !submitted && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Sugerir uma aula
              </button>
            )}

            {showForm && !submitted && (
              <form
                onSubmit={handleSuggest}
                className="mt-4 mx-auto max-w-md space-y-3 text-left"
              >
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nome *</label>
                  <input
                    type="text"
                    required
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Telefone (opcional)</label>
                  <input
                    type="tel"
                    placeholder="(11) 9 0000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Aula que você quer ver *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: como consertar joystick drift PS5"
                    value={formData.lesson || debouncedQ}
                    onChange={(e) => setFormData((f) => ({ ...f, lesson: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {formError && (
                  <p className="text-xs text-red-400">{formError}</p>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {submitting ? "Enviando…" : "Enviar sugestão"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {submitted && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-5 py-3 text-sm font-medium text-emerald-400">
                Sugestão enviada! Obrigado — vamos analisar em breve.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SearchResultGroup({
  title,
  description,
  courses,
  lessons,
  query,
}: {
  title: string
  description: string
  courses: CourseResult[]
  lessons: LessonResult[]
  query: string
}) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-white sm:text-2xl">
          <span className="inline-block h-6 w-1 rounded-full bg-cyan-400" />
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>

      {courses.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Trilhas ({courses.length})
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <SearchTrailCard
                key={course.id}
                href={`/trilhas/${course.slug}`}
                accent={accentToHex(course.trailColorRgb)}
                thumbnail={course.bannerImage ?? course.coverImage}
                badge={course.badgeLabel}
                title={highlight(course.title, query)}
                description={course.shortDescription ? highlight(course.shortDescription, query) : `${course._count.lessons} aulas`}
              />
            ))}
          </div>
        </div>
      )}

      {lessons.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Aulas ({lessons.length})
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson) => {
              const thumbnail = lesson.thumbnail
                ?? (lesson.videoProviderId ? `https://${BUNNY_CDN_HOST}/${lesson.videoProviderId}/thumbnail.jpg` : null)
                ?? lesson.videoThumbnailUrl
                ?? lesson.course.bannerImage
                ?? lesson.course.coverImage
              const href = lesson.videoProviderId ? `/aula/bunny/${lesson.videoProviderId}` : `/aula/${lesson.id}`

              return (
                <SearchTrailCard
                  key={lesson.id}
                  href={href}
                  accent={accentToHex(lesson.course.trailColorRgb)}
                  thumbnail={thumbnail}
                  badge={lesson.isFree ? "GRÁTIS" : lesson.course.badgeLabel}
                  title={highlight(lesson.title, query)}
                  description={lesson.course.title}
                />
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
