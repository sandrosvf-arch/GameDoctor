"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Download,
  FileText,
  Link2,
  ChevronDown,
  Loader2,
  AlertCircle,
  Play,
  Lock,
  Menu,
  X,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Material {
  id: string
  title: string
  description: string | null
  fileUrl: string | null
  externalUrl: string | null
  type: string
}

interface LessonItem {
  id: string
  title: string
  durationSeconds: number | null
  videoDurationSeconds: number | null
  isFree: boolean
  order: number
  lessonProgress: { completedAt: string | null; watchedSeconds: number }[]
}

interface ModuleItem {
  id: string
  title: string
  order: number
  lessons: LessonItem[]
}

interface LessonData {
  id: string
  title: string
  description: string | null
  durationSeconds: number | null
  videoEmbedUrl: string | null
  videoPlaybackUrl: string | null
  videoThumbnailUrl: string | null
  isFree: boolean
  isAccessible: boolean
  previewEnabled: boolean
  previewDurationSeconds: number
  materials: Material[]
  progress: { completedAt: string | null; watchedSeconds: number } | null
}

interface ApiResponse {
  lesson: LessonData
  course: { id: string; title: string; slug: string; modules: ModuleItem[] }
  prevLesson: { id: string; title: string } | null
  nextLesson: { id: string; title: string } | null
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

const materialIcon: Record<string, React.ReactNode> = {
  PDF:         <FileText className="h-4 w-4 text-red-400" />,
  SPREADSHEET: <FileText className="h-4 w-4 text-green-400" />,
  LINK:        <Link2   className="h-4 w-4 text-blue-400" />,
  CHECKLIST:   <CheckCircle2 className="h-4 w-4 text-amber-400" />,
  IMAGE:       <FileText className="h-4 w-4 text-purple-400" />,
}

function PaywallOverlay({ lessonId }: { lessonId: string }) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6"
      style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.92) 60%, rgba(0,0,0,0.98) 100%)" }}
    >
      <div className="max-w-md space-y-5">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Sparkles className="h-6 w-6" />
          <span className="text-sm font-semibold uppercase tracking-widest">Prévia encerrada</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
          Continue assistindo com assinatura
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Desbloqueie este curso e todos os outros com acesso vitalício.
          Diagnóstico, soldas, trocas de componentes — tudo em um plano.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button size="lg" className="text-base px-8" asChild>
            <Link href="/#planos">
              <Sparkles className="h-4 w-4 mr-2" />
              Ver planos
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
            <Link href={`/login?callbackUrl=/aula/${lessonId}`}>
              Já tenho acesso
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AulaClient({ lessonId }: { lessonId: string }) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paywallVisible, setPaywallVisible] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [markingDone, setMarkingDone] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showPaywall = useCallback(() => {
    setPaywallVisible(true)
    if (videoRef.current) videoRef.current.pause()
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPaywallVisible(false)
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)

    try {
      const res = await fetch(`/api/lessons/${lessonId}`)
      if (!res.ok) { setError("NOT_FOUND"); return }
      const json: ApiResponse = await res.json()
      setData(json)

      const activeModule = json.course.modules.find((m) =>
        m.lessons.some((l) => l.id === lessonId)
      )
      if (activeModule) setOpenModules(new Set([activeModule.id]))

      if (!json.lesson.isAccessible) {
        const secs = json.lesson.previewDurationSeconds
        previewTimerRef.current = setTimeout(() => {
          setPaywallVisible(true)
          if (videoRef.current) videoRef.current.pause()
        }, secs * 1000)
      }
    } catch {
      setError("ERROR")
    } finally {
      setLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    load()
    return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current) }
  }, [load])

  const handleTimeUpdate = useCallback(() => {
    if (!data || data.lesson.isAccessible) return
    const vid = videoRef.current
    if (!vid) return
    if (vid.currentTime >= data.lesson.previewDurationSeconds) {
      showPaywall()
    }
  }, [data, showPaywall])

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev)
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId)
      return next
    })
  }

  const markComplete = async () => {
    if (!data || markingDone) return
    setMarkingDone(true)
    await fetch(`/api/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, completed: true }),
    })
    await load()
    setMarkingDone(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 gap-4 text-center px-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-zinc-400">Aula não encontrada ou indisponível.</p>
        <Button variant="outline" asChild>
          <Link href="/cursos">Ver cursos</Link>
        </Button>
      </div>
    )
  }

  const { lesson, course, prevLesson, nextLesson } = data
  const isCompleted = !!lesson.progress?.completedAt

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/80 backdrop-blur-sm border-b border-white/5">
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white px-2" asChild>
            <Link href="/cursos">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Cursos
            </Link>
          </Button>
          <span className="text-white/20 hidden sm:inline">/</span>
          <span className="text-sm text-zinc-400 truncate max-w-[180px] hidden sm:inline">{course.title}</span>
          <span className="text-white/20 hidden sm:inline">/</span>
          <span className="text-sm text-white truncate max-w-[180px] hidden sm:inline">{lesson.title}</span>

          <div className="ml-auto flex items-center gap-2">
            {!lesson.isAccessible && !paywallVisible && (
              <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full">
                Trailer
              </span>
            )}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="lg:hidden p-1.5 rounded hover:bg-white/10 transition"
              aria-label="Módulos"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Video player */}
        <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
          {paywallVisible && <PaywallOverlay lessonId={lessonId} />}

          {lesson.videoEmbedUrl ? (
            <iframe
              src={`${lesson.videoEmbedUrl}${lesson.videoEmbedUrl.includes("?") ? "&" : "?"}autoplay=1&muted=1`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          ) : lesson.videoPlaybackUrl ? (
            <video
              ref={videoRef}
              src={lesson.videoPlaybackUrl}
              controls
              autoPlay
              muted
              className="absolute inset-0 w-full h-full"
              poster={lesson.videoThumbnailUrl ?? undefined}
              onTimeUpdate={handleTimeUpdate}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div
                className="absolute inset-0 bg-zinc-900"
                style={
                  lesson.videoThumbnailUrl
                    ? { backgroundImage: `url(${lesson.videoThumbnailUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : undefined
                }
              />
              <div className="absolute inset-0 bg-black/70" />
              <Play className="relative z-10 h-14 w-14 opacity-20" />
              <p className="relative z-10 text-zinc-500 text-sm">Vídeo em processamento</p>
            </div>
          )}
        </div>

        {/* Info bar */}
        <div className="bg-zinc-900 border-b border-white/5 px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-snug">{lesson.title}</h1>
            {lesson.durationSeconds && (
              <p className="text-xs text-zinc-500 mt-0.5">{formatDuration(lesson.durationSeconds)}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {prevLesson && (
              <Button variant="outline" size="sm" className="border-white/10 bg-white/5 hover:bg-white/10 text-white" asChild>
                <Link href={`/aula/${prevLesson.id}`}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Link>
              </Button>
            )}
            {lesson.isAccessible && (
              <Button
                size="sm"
                variant={isCompleted ? "secondary" : "default"}
                onClick={markComplete}
                disabled={markingDone || isCompleted}
              >
                {markingDone ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : isCompleted ? <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" />
                  : <Circle className="h-4 w-4 mr-2" />}
                {isCompleted ? "Concluída" : "Concluir"}
              </Button>
            )}
            {nextLesson && (
              <Button size="sm" asChild>
                <Link href={`/aula/${nextLesson.id}`}>
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Description + materials */}
        <div className="flex-1 px-4 py-6 space-y-6 max-w-4xl">
          {lesson.description && (
            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{lesson.description}</p>
          )}

          {lesson.materials.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Materiais</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lesson.materials.map((mat) => (
                  <a
                    key={mat.id}
                    href={mat.externalUrl ?? mat.fileUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition group"
                  >
                    {materialIcon[mat.type] ?? <FileText className="h-4 w-4 text-zinc-500" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{mat.title}</p>
                      {mat.description && <p className="text-xs text-zinc-500 truncate">{mat.description}</p>}
                    </div>
                    {mat.fileUrl && <Download className="h-4 w-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition shrink-0" />}
                  </a>
                ))}
              </div>
            </div>
          )}

          {!lesson.isAccessible && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Lock className="h-8 w-8 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Assine para ver o conteúdo completo</p>
                <p className="text-sm text-zinc-400 mt-0.5">Desbloqueie todos os cursos com um único pagamento.</p>
              </div>
              <Button asChild className="shrink-0">
                <Link href="/#planos">Ver planos</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Module Sidebar */}
      <aside className={cn(
        "fixed lg:relative top-0 right-0 z-40 lg:z-auto h-full lg:h-auto",
        "w-80 xl:w-96 flex flex-col bg-zinc-900 border-l border-white/5",
        "transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm px-4 py-3 border-b border-white/5 z-10">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Conteúdo</p>
              <p className="text-sm font-medium mt-0.5 truncate">{course.title}</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-zinc-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {course.modules.map((mod) => {
            const isOpen = openModules.has(mod.id)
            const completedCount = mod.lessons.filter((l) => l.lessonProgress?.[0]?.completedAt).length

            return (
              <div key={mod.id} className="border-b border-white/5">
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition text-left gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{mod.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{completedCount}/{mod.lessons.length} aulas</p>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-zinc-500 shrink-0 transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                  <div className="bg-black/20">
                    {mod.lessons.map((l) => {
                      const isCurrent = l.id === lessonId
                      const done = !!l.lessonProgress?.[0]?.completedAt
                      const dur = l.videoDurationSeconds ?? l.durationSeconds
                      return (
                        <Link
                          key={l.id}
                          href={`/aula/${l.id}`}
                          className={cn(
                            "flex items-start gap-3 px-4 py-2.5 text-sm transition-colors border-l-2",
                            isCurrent
                              ? "bg-primary/15 text-primary border-primary"
                              : "text-zinc-400 hover:bg-white/5 hover:text-white border-transparent"
                          )}
                        >
                          <div className="mt-0.5 shrink-0">
                            {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              : isCurrent ? <Play className="h-4 w-4 text-primary fill-primary" />
                              : <Circle className="h-4 w-4 opacity-25" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate leading-snug">{l.title}</p>
                            {dur && <p className="text-xs text-zinc-600 mt-0.5">{formatDuration(dur)}</p>}
                          </div>
                          {l.isFree && !isCurrent && (
                            <Badge variant="secondary" className="text-[10px] shrink-0 bg-emerald-900/50 text-emerald-400 border-emerald-700/50">Grátis</Badge>
                          )}
                          {!l.isFree && !isCurrent && <Lock className="h-3 w-3 text-zinc-600 shrink-0 mt-1" />}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}
