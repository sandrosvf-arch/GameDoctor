"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
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
  Sparkles,
  MessageSquare,
  Send,
  User2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/Header"
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

interface CommentItem {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string; avatarUrl: string | null }
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false })

const materialIcon: Record<string, React.ReactNode> = {
  PDF: <FileText className="h-4 w-4 text-red-400" />,
  SPREADSHEET: <FileText className="h-4 w-4 text-green-400" />,
  LINK: <Link2 className="h-4 w-4 text-blue-400" />,
  CHECKLIST: <CheckCircle2 className="h-4 w-4 text-amber-400" />,
  IMAGE: <FileText className="h-4 w-4 text-purple-400" />,
}

function PaywallOverlay({ lessonId }: { lessonId: string }) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 rounded-xl"
      style={{
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.88) 55%, rgba(0,0,0,0.97) 100%)",
      }}
    >
      <div className="max-w-md space-y-4">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">
            Prévia encerrada
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
          Continue assistindo
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Para continuar vendo esta aula, escolha um plano de assinatura.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
          <Button size="default" asChild>
            <Link href="/planos">
              <Sparkles className="h-4 w-4 mr-2" />
              Continuar assistindo
            </Link>
          </Button>
          <Button
            size="default"
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            asChild
          >
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
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [markingDone, setMarkingDone] = useState(false)

  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsVisible, setCommentsVisible] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showPaywall = useCallback(() => {
    setPaywallVisible(true)
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
        const secs = json.lesson.previewDurationSeconds ?? 7
        previewTimerRef.current = setTimeout(() => setPaywallVisible(true), secs * 1000)
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

  const handleProgress = useCallback((state: { playedSeconds?: number }) => {
    if (!data || data.lesson.isAccessible) return
    const playedSeconds = state.playedSeconds ?? 0
    if (playedSeconds >= data.lesson.previewDurationSeconds) {
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
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, completed: true }),
    })
    await load()
    setMarkingDone(false)
  }

  const loadComments = useCallback(async () => {
    setCommentsLoading(true)
    try {
      const res = await fetch(`/api/lessons/${lessonId}/comments`)
      if (res.ok) setComments(await res.json())
    } finally {
      setCommentsLoading(false)
    }
  }, [lessonId])

  useEffect(() => { if (commentsVisible) loadComments() }, [commentsVisible, loadComments])

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    setCommentError(null)
    if (!commentText.trim()) return
    setSubmittingComment(true)
    const res = await fetch(`/api/lessons/${lessonId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText.trim() }),
    })
    setSubmittingComment(false)
    if (res.status === 401) { setCommentError("Faça login para comentar."); return }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setCommentError(d.error ?? "Erro ao enviar comentário.")
      return
    }
    const newComment: CommentItem = await res.json()
    setComments((prev) => [...prev, newComment])
    setCommentText("")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-muted-foreground">Aula não encontrada ou indisponível.</p>
          <Button variant="outline" asChild>
            <Link href="/cursos">Ver cursos</Link>
          </Button>
        </div>
      </div>
    )
  }

  const { lesson, course, prevLesson, nextLesson } = data
  const isCompleted = !!lesson.progress?.completedAt

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-border/50 bg-muted/30">
        <div className="container flex items-center gap-2 h-10 text-sm text-muted-foreground">
          <Link href="/cursos" className="hover:text-foreground transition-colors">
            Cursos
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground truncate max-w-[200px]">{course.title}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate max-w-[200px]">{lesson.title}</span>
        </div>
      </div>

      <div className="container py-6">
        <div className="flex gap-6 items-start">

          {/* ── Left / Main column ── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Video player */}
            <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-xl" style={{ aspectRatio: "16/9" }}>
              {paywallVisible && <PaywallOverlay lessonId={lessonId} />}

              {!paywallVisible && lesson.videoPlaybackUrl ? (
                <ReactPlayer
                  src={lesson.videoPlaybackUrl}
                  playing
                  controls
                  muted
                  width="100%"
                  height="100%"
                  className="absolute inset-0"
                  onProgress={handleProgress}
                />
              ) : !paywallVisible && lesson.videoEmbedUrl ? (
                <iframe
                  src={`${lesson.videoEmbedUrl}${lesson.videoEmbedUrl.includes("?") ? "&" : "?"}autoplay=1&muted=1`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={lesson.title}
                />
              ) : !paywallVisible ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900">
                  <Play className="h-14 w-14 opacity-20" />
                  <p className="text-zinc-500 text-sm">Vídeo em processamento</p>
                </div>
              ) : null}
            </div>

            {/* Title + actions bar */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-snug">{lesson.title}</h1>
                <div className="flex items-center gap-3 mt-1">
                  {lesson.durationSeconds && (
                    <span className="text-sm text-muted-foreground">{formatDuration(lesson.durationSeconds)}</span>
                  )}
                  {!lesson.isAccessible && (
                    <span className="text-xs bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full">
                      Prévia gratuita
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-xs bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Concluída
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {prevLesson && (
                  <Button variant="outline" size="sm" asChild>
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
                    {markingDone ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 mr-2" />
                    )}
                    {isCompleted ? "Concluída" : "Concluir aula"}
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

            {/* Description */}
            {lesson.description && (
              <div className="prose prose-sm prose-invert max-w-none">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{lesson.description}</p>
              </div>
            )}

            {/* Materials */}
            {lesson.materials.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  Materiais da aula
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {lesson.materials.map((mat) => (
                    <a
                      key={mat.id}
                      href={mat.externalUrl ?? mat.fileUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition group"
                    >
                      {materialIcon[mat.type] ?? <FileText className="h-4 w-4 text-muted-foreground" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{mat.title}</p>
                        {mat.description && (
                          <p className="text-xs text-muted-foreground truncate">{mat.description}</p>
                        )}
                      </div>
                      {mat.fileUrl && (
                        <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Paywall CTA (inline) */}
            {!lesson.isAccessible && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Lock className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Assine para ver o conteúdo completo</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Desbloqueie todos os cursos com um único pagamento.
                  </p>
                </div>
                <Button asChild className="shrink-0">
                  <Link href="/#planos">Ver planos</Link>
                </Button>
              </div>
            )}

            {/* Comments */}
            <div>
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Comentários
                {comments.length > 0 && (
                  <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-xs font-normal">
                    {comments.length}
                  </span>
                )}
              </h2>

              {!commentsVisible ? (
                <div className="flex justify-center py-6">
                  <Button variant="outline" size="sm" onClick={() => setCommentsVisible(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Carregar comentários
                  </Button>
                </div>
              ) : (
                <>
              {/* Comment form */}
              <form onSubmit={submitComment} className="mb-6">
                <div className="flex gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                    <User2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Deixe sua dúvida ou comentário..."
                      rows={3}
                      className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    {commentError && (
                      <p className="text-xs text-destructive mt-1">{commentError}</p>
                    )}
                    <div className="flex justify-end mt-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={submittingComment || !commentText.trim()}
                      >
                        {submittingComment ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Enviar
                      </Button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Comments list */}
              {commentsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Seja o primeiro a comentar nesta aula.
                </p>
              ) : (
                <div className="space-y-5">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                        {c.user.avatarUrl ? (
                          <img
                            src={c.user.avatarUrl}
                            alt={c.user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-medium">{c.user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
                </>
              )}
            </div>
          </div>

          {/* ── Right / Module Sidebar ── */}
          <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 sticky top-20 max-h-[calc(100vh-5rem)] rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Conteúdo do curso
              </p>
              <p className="text-sm font-semibold mt-0.5 truncate">{course.title}</p>
            </div>

            <div className="overflow-y-auto flex-1">
              {course.modules.map((mod) => {
                const isOpen = openModules.has(mod.id)
                const completedCount = mod.lessons.filter(
                  (l) => l.lessonProgress?.[0]?.completedAt
                ).length

                return (
                  <div key={mod.id} className="border-b border-border last:border-b-0">
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition text-left gap-2"
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

                    {isOpen && (
                      <div>
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
                                  ? "bg-primary/10 text-primary border-primary"
                                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-transparent"
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
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatDuration(dur)}
                                  </p>
                                )}
                              </div>
                              {l.isFree && !isCurrent && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] shrink-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                >
                                  Grátis
                                </Badge>
                              )}
                              {!l.isFree && !isCurrent && (
                                <Lock className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
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
      </div>
    </div>
  )
}
