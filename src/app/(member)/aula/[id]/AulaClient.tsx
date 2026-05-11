"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────
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
  materials: Material[]
  progress: { completedAt: string | null; watchedSeconds: number } | null
}

interface ApiResponse {
  lesson: LessonData
  course: { id: string; title: string; slug: string; modules: ModuleItem[] }
  prevLesson: { id: string; title: string } | null
  nextLesson: { id: string; title: string } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

const materialIcon: Record<string, React.ReactNode> = {
  PDF: <FileText className="h-4 w-4 text-red-400" />,
  SPREADSHEET: <FileText className="h-4 w-4 text-green-400" />,
  LINK: <Link2 className="h-4 w-4 text-blue-400" />,
  CHECKLIST: <CheckCircle2 className="h-4 w-4 text-amber-400" />,
  IMAGE: <FileText className="h-4 w-4 text-purple-400" />,
}

// ── Component ──────────────────────────────────────────────────────────────
export default function AulaClient({ lessonId }: { lessonId: string }) {
  const router = useRouter()
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [markingDone, setMarkingDone] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/lessons/${lessonId}`)
      if (res.status === 401) { router.push("/login"); return }
      if (res.status === 403) { setError("NO_ACCESS"); return }
      if (!res.ok) { setError("NOT_FOUND"); return }
      const json: ApiResponse = await res.json()
      setData(json)
      // Auto-open the module that contains the current lesson
      const activeModule = json.course.modules.find((m) =>
        m.lessons.some((l) => l.id === lessonId)
      )
      if (activeModule) setOpenModules(new Set([activeModule.id]))
    } catch {
      setError("ERROR")
    } finally {
      setLoading(false)
    }
  }, [lessonId, router])

  useEffect(() => { load() }, [load])

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

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // ── Error states ──
  if (error === "NO_ACCESS") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold mb-2">Conteúdo exclusivo para assinantes</h2>
          <p className="text-muted-foreground mb-6">Faça upgrade do seu plano para ter acesso a esta aula.</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button asChild>
            <Link href="/#planos">Ver planos</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/suporte">Falar com suporte</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">Aula não encontrada ou indisponível.</p>
        <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
      </div>
    )
  }

  const { lesson, course, prevLesson, nextLesson } = data
  const isCompleted = !!lesson.progress?.completedAt

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">

      {/* ── Player column ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2 text-xs text-muted-foreground flex-wrap">
          <Link href="/meus-cursos" className="hover:text-foreground transition-colors">
            Meus Cursos
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link href={`/curso/${course.slug}`} className="hover:text-foreground transition-colors truncate max-w-[160px]">
            {course.title}
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-foreground truncate max-w-[200px]">{lesson.title}</span>
        </div>

        {/* Video player */}
        <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
          {lesson.videoEmbedUrl ? (
            <iframe
              src={lesson.videoEmbedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          ) : lesson.videoPlaybackUrl ? (
            <video
              src={lesson.videoPlaybackUrl}
              controls
              className="absolute inset-0 w-full h-full"
              poster={lesson.videoThumbnailUrl ?? undefined}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Play className="h-12 w-12 opacity-30" />
              <p className="text-sm">Vídeo ainda não disponível</p>
            </div>
          )}
        </div>

        {/* Lesson info */}
        <div className="flex-1 px-4 py-6 space-y-6 max-w-4xl">

          {/* Title + complete button */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold leading-snug">{lesson.title}</h1>
              {lesson.durationSeconds && (
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDuration(lesson.durationSeconds)}
                </p>
              )}
            </div>
            <Button
              variant={isCompleted ? "secondary" : "default"}
              size="sm"
              onClick={markComplete}
              disabled={markingDone || isCompleted}
              className="shrink-0"
            >
              {markingDone ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isCompleted ? (
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 mr-2" />
              )}
              {isCompleted ? "Concluída" : "Marcar como concluída"}
            </Button>
          </div>

          {/* Description */}
          {lesson.description && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {lesson.description}
            </p>
          )}

          {/* Materials */}
          {lesson.materials.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">
                Materiais
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lesson.materials.map((mat) => {
                  const href = mat.externalUrl ?? mat.fileUrl ?? "#"
                  const isDownload = !!mat.fileUrl
                  return (
                    <a
                      key={mat.id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
                    >
                      {materialIcon[mat.type] ?? <FileText className="h-4 w-4 text-muted-foreground" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{mat.title}</p>
                        {mat.description && (
                          <p className="text-xs text-muted-foreground truncate">{mat.description}</p>
                        )}
                      </div>
                      {isDownload && (
                        <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      )}
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Prev / Next navigation */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
            {prevLesson ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/aula/${prevLesson.id}`}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  <span className="max-w-[160px] truncate">{prevLesson.title}</span>
                </Link>
              </Button>
            ) : <div />}

            {nextLesson ? (
              <Button size="sm" asChild>
                <Link href={`/aula/${nextLesson.id}`}>
                  <span className="max-w-[160px] truncate">{nextLesson.title}</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="secondary" asChild>
                <Link href={`/curso/${course.slug}`}>
                  Ver curso completo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Sidebar — modules + lessons ───────────────────────────────────── */}
      <aside className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-border flex flex-col shrink-0">
        <div className="sticky top-0 bg-card/80 backdrop-blur-sm px-4 py-3 border-b border-border z-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Conteúdo do curso
          </p>
          <p className="text-sm font-medium mt-0.5 truncate">{course.title}</p>
        </div>

        <div className="overflow-y-auto flex-1">
          {course.modules.map((mod) => {
            const isOpen = openModules.has(mod.id)
            const completedCount = mod.lessons.filter(
              (l) => l.lessonProgress[0]?.completedAt
            ).length

            return (
              <div key={mod.id} className="border-b border-border/50">
                {/* Module header */}
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors text-left gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{mod.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {completedCount}/{mod.lessons.length} aulas
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Lessons list */}
                {isOpen && (
                  <div className="bg-background/40">
                    {mod.lessons.map((l) => {
                      const isCurrent = l.id === lessonId
                      const done = !!l.lessonProgress[0]?.completedAt
                      const dur = l.videoDurationSeconds ?? l.durationSeconds

                      return (
                        <Link
                          key={l.id}
                          href={`/aula/${l.id}`}
                          className={cn(
                            "flex items-start gap-3 px-4 py-2.5 text-sm transition-colors",
                            isCurrent
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <div className="mt-0.5 shrink-0">
                            {done ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : isCurrent ? (
                              <Play className="h-4 w-4 text-primary fill-primary" />
                            ) : (
                              <Circle className="h-4 w-4 opacity-30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate leading-snug">{l.title}</p>
                            {dur && (
                              <p className="text-xs opacity-60 mt-0.5">{formatDuration(dur)}</p>
                            )}
                          </div>
                          {l.isFree && !isCurrent && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              Grátis
                            </Badge>
                          )}
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
