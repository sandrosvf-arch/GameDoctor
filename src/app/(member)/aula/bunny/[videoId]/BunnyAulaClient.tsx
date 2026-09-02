'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Link2,
  List,
  Loader2,
  Lock,
  MessageSquare,
  Paperclip,
  Play,
  Repeat,
  Send,
  SkipBack,
  SkipForward,
  Sparkles,
  User2,
  MessageCircle,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BUNNY_CDN_HOST } from "@/lib/constants"
import { useLessonProgress } from "@/lib/use-lesson-progress"
import { LessonReleaseLock } from "@/components/lessons/LessonReleaseLock"
import { BunnyEmbedPlayer } from "@/components/lessons/BunnyPreviewPlayer"

export interface LessonMaterial {
  id: string
  title: string
  fileUrl: string | null
  externalUrl: string | null
  type: string
}

export interface CourseLessonInfo {
  id: string
  title: string
  videoProviderId: string | null
  thumbnail: string | null
  videoThumbnailUrl: string | null
  isFree: boolean
  videoDurationSeconds: number | null
  durationSeconds: number | null
  moduleId: string | null
  module: { id: string; title: string } | null
}

interface CommentItem {
  id: string
  content: string
  contentLocked?: boolean
  createdAt: string
  user: { id: string; name: string; avatarUrl: string | null }
  replies: Array<{
    id: string
    content: string
    contentLocked?: boolean
    createdAt: string
    user: { id: string; name: string; avatarUrl: string | null }
  }>
}

function formatSecs(seconds: number | null | undefined): string | null {
  if (!seconds) return null
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining > 0 ? `${minutes}min ${remaining}s` : `${minutes}min`
}

interface BunnyAulaClientProps {
  videoId: string
  lessonId: string | null
  title: string
  subtitle: string | null
  duration: string | null
  durationSeconds: number | null
  previewImage: string | null
  embedUrl: string
  isAccessible: boolean
  isReleaseLocked: boolean
  releaseAt: string | null
  canViewRestrictedContent: boolean
  canPreview: boolean
  previewEmbedUrl: string
  isFree: boolean
  courseTitle: string
  courseSlug: string | null
  description: string | null
  courseLessons: CourseLessonInfo[]
  nextLesson: CourseLessonInfo | null
  materials: LessonMaterial[]
  initialCompleted: boolean
  initialWatchedSeconds: number
}

export default function BunnyAulaClient({
  videoId,
  lessonId,
  title,
  subtitle,
  duration,
  durationSeconds,
  previewImage,
  embedUrl,
  isAccessible,
  isReleaseLocked,
  releaseAt,
  canViewRestrictedContent,
  canPreview,
  previewEmbedUrl,
  isFree,
  courseTitle,
  courseSlug,
  description,
  courseLessons,
  nextLesson,
  materials,
  initialCompleted,
  initialWatchedSeconds,
}: BunnyAulaClientProps) {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const isGuest = sessionStatus === "unauthenticated"
  const [mounted, setMounted] = useState(false)
  const [paywallVisible, setPaywallVisible] = useState(false)
  const [started, setStarted] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [completingLesson, setCompletingLesson] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [commentInfo, setCommentInfo] = useState<string | null>(null)
  const advancingRef = useRef(false)
  const {
    completed,
    handlePlaybackProgress,
    flushProgress,
    markCompleted,
  } = useLessonProgress({
    lessonId,
    enabled: isAccessible,
    durationSeconds,
    initialWatchedSeconds,
    initialCompleted,
    trackingMode: "session",
  })

  useEffect(() => {
    setMounted(true)
    setPaywallVisible(false)
    setStarted(false)
    setComments([])
    setCommentText("")
    setCommentError(null)
    setCommentInfo(null)
    advancingRef.current = false

    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
    const saved = localStorage.getItem("gamedoctor_autoadvance")
    if (saved === "1") setAutoAdvance(true)
  }, [videoId])


  const handleMarkComplete = useCallback(async () => {
    if (!lessonId || completingLesson || completed) return

    setCompletingLesson(true)
    try {
      await markCompleted()
    } finally {
      setCompletingLesson(false)
    }
  }, [completed, completingLesson, lessonId, markCompleted])

  const toggleAutoAdvance = useCallback(() => {
    setAutoAdvance((prev) => {
      const nextValue = !prev
      localStorage.setItem("gamedoctor_autoadvance", nextValue ? "1" : "0")
      return nextValue
    })
  }, [])

  const handleEnded = useCallback(() => {
    if (!isAccessible || !autoAdvance || !nextLesson || advancingRef.current) return
    advancingRef.current = true

    const href = nextLesson.videoProviderId
      ? `/aula/bunny/${nextLesson.videoProviderId}`
      : `/aula/${nextLesson.id}`

    window.location.assign(href)
  }, [autoAdvance, isAccessible, nextLesson])

  const loadComments = useCallback(async () => {
    if (!lessonId) return

    setCommentsLoading(true)
    setCommentError(null)
    try {
      const res = await fetch(`/api/lessons/${lessonId}/comments`)
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setCommentError(data?.error ?? "Não foi possível carregar os comentários.")
        return
      }

      setComments(Array.isArray(data) ? data : [])
    } finally {
      setCommentsLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    if (!isReleaseLocked && lessonId) {
      void loadComments()
    }
  }, [isReleaseLocked, lessonId, loadComments])

  const submitComment = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!lessonId || !commentText.trim()) return

    if (isGuest) {
      const callbackUrl = window.location.pathname + window.location.search
      router.push("/login?callbackUrl=" + encodeURIComponent(callbackUrl))
      return
    }

    setCommentError(null)
    setCommentInfo(null)
    setSubmittingComment(true)

    try {
      const res = await fetch(`/api/lessons/${lessonId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      })

      if (res.status === 401) {
        setCommentError("Faça login para comentar.")
        return
      }

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setCommentError(data.error ?? "Erro ao enviar comentário.")
        return
      }

      if (data.pending) {
        setCommentInfo(data.message ?? "Comentário enviado para aprovação.")
        setCommentText("")
        return
      }

      setComments((prev) => [...prev, data.comment as CommentItem])
      setCommentText("")
      setCommentInfo("Comentário publicado com sucesso.")
    } finally {
      setSubmittingComment(false)
    }
  }, [commentText, isGuest, lessonId, router])

  const groupedLessons = useMemo(() => {
    const groups: Array<{
      module: { id: string; title: string } | null
      lessons: CourseLessonInfo[]
    }> = []

    for (const lesson of courseLessons) {
      const key = lesson.moduleId ?? null
      const existing = groups.find((group) => (group.module?.id ?? null) === key)

      if (existing) {
        existing.lessons.push(lesson)
      } else {
        groups.push({ module: lesson.module ?? null, lessons: [lesson] })
      }
    }

    return groups
  }, [courseLessons])

  const currentIdx = useMemo(
    () => courseLessons.findIndex((lesson) => lesson.videoProviderId === videoId),
    [courseLessons, videoId]
  )

  const prevLesson = currentIdx > 0 ? courseLessons[currentIdx - 1] : null

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden border-b border-border/50 bg-muted/30 md:block">
        <div className="container flex h-10 items-center gap-2 text-sm text-muted-foreground">
          <Link href="/cursos" className="transition-colors hover:text-foreground">
            Cursos
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-foreground">{courseTitle}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[300px] truncate">{title}</span>
        </div>
      </div>

      <div className="container px-4 py-5 pb-36 sm:px-6 md:py-6 md:pb-6 lg:px-8">
        <div className="flex items-start gap-6">
          <div className="min-w-0 flex-1 space-y-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-zinc-400 active:text-white md:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <div className="space-y-2">
              <h1 className="text-xl font-bold leading-snug md:text-2xl">{title}</h1>
              {(subtitle || duration || isFree) && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {duration && <span>{duration}</span>}
                  {!isAccessible && isFree && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      Prévia gratuita
                    </span>
                  )}
                </div>
              )}
            </div>

            <div
              className="relative -mx-4 w-[calc(100%+2rem)] overflow-hidden rounded-none bg-black shadow-xl sm:-mx-6 sm:w-[calc(100%+3rem)] md:mx-0 md:w-full md:rounded-xl"
              style={{ aspectRatio: "16/9" }}
            >
              {isReleaseLocked ? (
                <div className="absolute inset-0">
                  {previewImage && (
                    <img src={previewImage} alt={title} className="absolute inset-0 h-full w-full object-cover brightness-[1.2]" draggable={false} />
                  )}
                  {releaseAt && (
                    <LessonReleaseLock releaseAt={releaseAt} onReleased={() => router.refresh()} />
                  )}
                </div>
              ) : !isAccessible ? (
                <div className="absolute inset-0">
                  {canPreview && previewEmbedUrl && !paywallVisible ? (
                    !started ? (
                      <>
                        {previewImage && (
                          <img
                            src={previewImage}
                            alt={title}
                            className="absolute inset-0 h-full w-full object-cover brightness-[1.2]"
                            draggable={false}
                          />
                        )}
                        <button
                          onClick={() => setStarted(true)}
                          aria-label="Assistir prévia"
                          className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors"
                        >
                          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white shadow-2xl backdrop-blur transition-colors hover:bg-black/65">
                            <Play className="h-7 w-7 fill-white" />
                          </span>
                        </button>
                      </>
                    ) : mounted ? (
                      <BunnyEmbedPlayer
                        embedUrl={previewEmbedUrl}
                        title={`Prévia: ${title}`}
                        onEnded={() => setPaywallVisible(true)}
                      />
                    ) : null
                  ) : (
                    <>
                      {previewImage && (
                        <img
                          src={previewImage}
                          alt={title}
                          className="absolute inset-0 h-full w-full object-cover brightness-[1.2]"
                          draggable={false}
                        />
                      )}
                      {!paywallVisible && (
                        <button
                          onClick={() => setPaywallVisible(true)}
                          aria-label="Ver opções de acesso"
                          className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors"
                        >
                          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white shadow-2xl backdrop-blur transition-colors hover:bg-black/65">
                            <Play className="h-7 w-7 fill-white" />
                          </span>
                        </button>
                      )}
                    </>
                  )}

                  {paywallVisible && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-6 text-center animate-in fade-in duration-300 backdrop-blur-[1px]">
                      <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-zinc-950/70 p-5 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center justify-center gap-2 text-white">
                          <Play className="h-4 w-4 fill-white" />
                          <p className="text-base font-semibold">Continue assistindo</p>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                          Entre para a maior e mais completa plataforma de formação de técnicos em videogames do Brasil
                        </p>
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Link
                            href="/planos"
                            className="cta-shine inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_8px_24px_rgba(16,185,129,0.28)]"
                          >
                            <span className="relative z-10">Continuar assistindo</span>
                            <span
                              aria-hidden
                              className="cta-shine-pass pointer-events-none absolute inset-y-[-45%] left-[-60%] w-[52%] -skew-x-[20deg] bg-gradient-to-r from-white/0 via-white/65 to-white/0 blur-[0.5px]"
                            />
                          </Link>
                          <Link
                            href={`/login?callbackUrl=/aula/bunny/${videoId}`}
                            className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                          >
                            Já tenho acesso
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : !started ? (
                <div className="absolute inset-0">
                  {previewImage && (
                    <img
                      src={previewImage}
                      alt={title}
                      className="absolute inset-0 h-full w-full object-cover brightness-[1.2]"
                      draggable={false}
                    />
                  )}
                  <button
                    onClick={() => setStarted(true)}
                    aria-label="Assistir aula"
                    className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white shadow-2xl backdrop-blur transition-colors hover:bg-black/65">
                      <Play className="h-7 w-7 fill-white" />
                    </span>
                  </button>
                </div>
              ) : mounted ? (
                <BunnyEmbedPlayer
                  embedUrl={embedUrl.replace("autoplay=false", "autoplay=true")}
                  title={title}
                  onEnded={handleEnded}
                />
              ) : null}
            </div>
            
            {/* {isAccessible && lessonId && (
              <button
                onClick={handleMarkComplete}
                disabled={completingLesson || completed}
                className={cn(
                  "flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-60",
                  completed
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                    : "border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-400"
                )}
              >
                {completingLesson ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {completed ? "Aula concluída" : "Concluir aula"}
              </button>
            )} */}

            {(description || materials.length > 0) && (
              <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
                {description && (
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-semibold text-white">Descrição</h2>
                    <p className="whitespace-pre-line text-sm leading-7 text-white md:text-base md:leading-relaxed">
                      {description}
                    </p>
                  </div>
                )}

                {materials.length > 0 && (
                  <div className={description ? "space-y-2 border-t border-border/50 pt-4" : "space-y-2"}>
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      Arquivos da aula
                    </h2>
                    <div className="space-y-2">
                      {materials.map((material) => {
                        const url = material.externalUrl ?? material.fileUrl ?? "#"
                        const Icon = material.type === "PDF"
                          ? FileText
                          : material.type === "SPREADSHEET"
                            ? FileSpreadsheet
                            : material.type === "LINK"
                              ? Link2
                              : Paperclip

                        return (
                          <a
                            key={material.id}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-4 py-3 text-sm transition-colors hover:bg-muted/60"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate">{material.title}</span>
                            <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isReleaseLocked && (
            <div>
              <h2 id="aula-comments" className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Comentários
                {comments.length > 0 && (
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                    {comments.length}
                  </span>
                )}
              </h2>

              <div className="space-y-5">
                  <form onSubmit={submitComment} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/40">
                        {session?.user?.image ? (
                          <img src={session.user.image} alt={session.user.name ?? "Avatar"} className="h-full w-full object-cover" />
                        ) : (
                          <User2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                      <textarea
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        placeholder="Deixe sua dúvida ou comentário sobre esta aula..."
                        rows={4}
                        className="w-full rounded-lg border border-white/[0.1] bg-black/40 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      />
                      {commentError && (
                        <p className="text-xs text-destructive">{commentError}</p>
                      )}
                      {commentInfo && (
                        <p className="text-xs text-emerald-400">{commentInfo}</p>
                      )}
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={submittingComment || !commentText.trim()}
                        >
                          {submittingComment ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          {isGuest ? "Entrar para comentar" : "Publicar comentário"}
                        </Button>
                      </div>
                      </div>
                    </div>
                  </form>

                  {commentsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.03] px-5 py-8 text-center backdrop-blur-xl">
                      <p className="text-sm text-muted-foreground">Seja o primeiro a comentar nesta aula.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/40">
                              {comment.user.avatarUrl ? (
                                <img
                                  src={comment.user.avatarUrl}
                                  alt={comment.user.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <User2 className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex flex-wrap items-baseline gap-2">
                                <span className="text-sm font-medium text-foreground">{comment.user.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(comment.createdAt).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                              <p className={cn(
                                "whitespace-pre-wrap rounded-lg px-3 py-2.5 text-sm leading-relaxed",
                                comment.contentLocked
                                  ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
                                  : "bg-black/40 text-muted-foreground"
                              )}>
                                {comment.content}
                              </p>
                            </div>
                          </div>

                          {comment.replies.length > 0 && (
                            <div className="mt-4 space-y-3 pl-[52px]">
                              {comment.replies.map((reply) => (
                                <div
                                  key={reply.id}
                                  className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-3"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
                                      Equipe GameDoctor
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      {new Date(reply.createdAt).toLocaleDateString("pt-BR", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  <p className={cn(
                                    "mt-2 whitespace-pre-wrap text-sm leading-relaxed",
                                    reply.contentLocked ? "text-cyan-100" : "text-slate-200"
                                  )}>
                                    {reply.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </div>
            )}
          </div>

          <aside className="sticky top-20 hidden max-h-[calc(100vh-5rem)] w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl lg:flex xl:w-80">
            <div className="border-b border-white/10 bg-zinc-950 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trilha de aprendizado
              </p>
              <p className="mt-0.5 text-sm font-semibold">{courseTitle}</p>
            </div>

            <div className="flex items-center justify-between border-b border-white/10 bg-zinc-950/70 px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <SkipForward className="h-3.5 w-3.5" />
                Avançar automaticamente
              </div>
              <button
                onClick={toggleAutoAdvance}
                aria-label="Alternar avanço automático"
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors focus:outline-none",
                  autoAdvance ? "bg-primary" : "bg-muted-foreground/30"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    autoAdvance ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {groupedLessons.length === 0 ? (
                <p className="px-4 py-4 text-xs text-muted-foreground">Nenhuma aula encontrada.</p>
              ) : (
                groupedLessons.map(({ module, lessons }) => (
                  <div key={module?.id ?? "no-module"}>
                    {module && (
                      <div className="border-b border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {module.title}
                      </div>
                    )}
                    {lessons.map((lesson) => {
                      const isCurrent = lesson.videoProviderId === videoId
                      const href = lesson.videoProviderId
                        ? `/aula/bunny/${lesson.videoProviderId}`
                        : `/aula/${lesson.id}`
                      const lessonDuration = formatSecs(lesson.videoDurationSeconds ?? lesson.durationSeconds)
                      const thumb = lesson.thumbnail
                        ?? (lesson.videoProviderId ? `https://${BUNNY_CDN_HOST}/${lesson.videoProviderId}/thumbnail.jpg` : null)
                        ?? lesson.videoThumbnailUrl

                      return (
                        <Link
                          key={lesson.id}
                          href={href}
                          className={cn(
                            "flex items-center gap-2.5 border-l-2 px-3 py-2 text-sm transition-colors",
                            isCurrent
                              ? "border-primary bg-primary/10 text-primary backdrop-blur-xl"
                              : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          )}
                        >
                          <div className="relative aspect-video w-[76px] shrink-0 overflow-hidden rounded bg-zinc-800">
                            {thumb && (
                              <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover brightness-[1.2]" />
                            )}
                            {isCurrent && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                                <Play className="h-3.5 w-3.5 fill-white text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium leading-snug">{lesson.title}</p>
                            {lessonDuration && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{lessonDuration}</p>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 md:hidden">
        <div className="pointer-events-auto mx-4 mb-5 flex h-[60px] items-center justify-around rounded-2xl border border-white/[0.07] bg-zinc-900 px-1 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          {prevLesson ? (
            <Link
              href={prevLesson.videoProviderId ? `/aula/bunny/${prevLesson.videoProviderId}` : `/aula/${prevLesson.id}`}
              className="flex h-full w-[19%] flex-col items-center justify-center gap-0.5 text-zinc-300 transition-colors active:text-white"
            >
              <SkipBack className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">Anterior</span>
            </Link>
          ) : (
            <span className="flex h-full w-[19%] select-none flex-col items-center justify-center gap-0.5 cursor-not-allowed text-zinc-700">
              <SkipBack className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">Anterior</span>
            </span>
          )}

          {courseSlug ? (
            <Link
              href={`/trilhas/${courseSlug}`}
              className="flex h-full w-[19%] flex-col items-center justify-center gap-0.5 text-zinc-300 transition-colors active:text-white"
            >
              <List className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">Trilha</span>
            </Link>
          ) : (
            <button
              onClick={() => setListOpen((value) => !value)}
              className={cn(
                "flex h-full w-[19%] flex-col items-center justify-center gap-0.5 transition-colors active:opacity-70",
                listOpen ? "text-primary" : "text-zinc-300"
              )}
            >
              <List className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">Lista</span>
            </button>
          )}

          <button
            onClick={() => document.getElementById("aula-comments")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex h-full w-[19%] flex-col items-center justify-center gap-0.5 text-zinc-300 transition-colors active:text-white"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            <span className="text-[10px] font-medium">Comentar</span>
          </button>

          <button
            onClick={toggleAutoAdvance}
            className={cn(
              "flex h-full w-[19%] flex-col items-center justify-center gap-0.5 transition-colors active:opacity-70",
              autoAdvance ? "text-primary" : "text-zinc-300"
            )}
          >
            <Repeat className="h-[18px] w-[18px]" />
            <span className="text-[10px] font-medium">Auto</span>
          </button>

          {nextLesson ? (
            <Link
              href={nextLesson.videoProviderId ? `/aula/bunny/${nextLesson.videoProviderId}` : `/aula/${nextLesson.id}`}
              className="flex h-full w-[19%] flex-col items-center justify-center gap-0.5 text-zinc-300 transition-colors active:text-white"
            >
              <SkipForward className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">Próximo</span>
            </Link>
          ) : (
            <span className="flex h-full w-[19%] select-none flex-col items-center justify-center gap-0.5 cursor-not-allowed text-zinc-700">
              <SkipForward className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">Próximo</span>
            </span>
          )}
        </div>
      </div>

      {listOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setListOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 flex max-h-[78vh] flex-col rounded-t-2xl bg-zinc-900">
            <div className="shrink-0 border-b border-border/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Trilha de aprendizado
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">{courseTitle}</p>
                </div>
                <button onClick={() => setListOpen(false)} className="p-1 text-zinc-400">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pb-4">
              {groupedLessons.length === 0 ? (
                <p className="px-4 py-4 text-xs text-muted-foreground">Nenhuma aula encontrada.</p>
              ) : (
                groupedLessons.map(({ module, lessons }) => (
                  <div key={module?.id ?? "no-module"}>
                    {module && (
                      <div className="border-b border-border/40 bg-muted/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {module.title}
                      </div>
                    )}
                    {lessons.map((lesson) => {
                      const isCurrent = lesson.videoProviderId === videoId
                      const lessonDuration = formatSecs(lesson.videoDurationSeconds ?? lesson.durationSeconds)
                      const thumb = lesson.thumbnail
                        ?? (lesson.videoProviderId ? `https://${BUNNY_CDN_HOST}/${lesson.videoProviderId}/thumbnail.jpg` : null)
                        ?? lesson.videoThumbnailUrl

                      return (
                        <Link
                          key={lesson.id}
                          href={lesson.videoProviderId ? `/aula/bunny/${lesson.videoProviderId}` : `/aula/${lesson.id}`}
                          onClick={() => setListOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 border-l-2 px-3 py-2.5 transition-colors",
                            isCurrent
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-transparent text-muted-foreground active:bg-muted/40"
                          )}
                        >
                          <div className="relative aspect-video w-[72px] shrink-0 overflow-hidden rounded bg-zinc-800">
                            {thumb && (
                              <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover brightness-[1.2]" />
                            )}
                            {isCurrent && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <Play className="h-3.5 w-3.5 fill-white text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-medium leading-snug">{lesson.title}</p>
                            {lessonDuration && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{lessonDuration}</p>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
