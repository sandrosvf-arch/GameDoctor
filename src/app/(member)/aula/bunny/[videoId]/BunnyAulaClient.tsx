'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BUNNY_CDN_HOST } from "@/lib/constants"
import { useLessonProgress } from "@/lib/use-lesson-progress"

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
  createdAt: string
  user: { id: string; name: string; avatarUrl: string | null }
  replies: Array<{
    id: string
    content: string
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
  canViewRestrictedContent: boolean
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
  canViewRestrictedContent,
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
  const [mounted, setMounted] = useState(false)
  const [paywallVisible, setPaywallVisible] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [completingLesson, setCompletingLesson] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsVisible, setCommentsVisible] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [commentInfo, setCommentInfo] = useState<string | null>(null)
  const paywallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    setPreviewUrl(null)
    setComments([])
    setCommentsVisible(false)
    setCommentText("")
    setCommentError(null)
    setCommentInfo(null)

    if (paywallTimerRef.current) {
      clearTimeout(paywallTimerRef.current)
      paywallTimerRef.current = null
    }

    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
    const saved = localStorage.getItem("gamedoctor_autoadvance")
    if (saved === "1") setAutoAdvance(true)

    return () => {
      if (paywallTimerRef.current) {
        clearTimeout(paywallTimerRef.current)
        paywallTimerRef.current = null
      }
    }
  }, [videoId])

  const handlePreviewPlay = useCallback(async () => {
    if (previewLoading || previewUrl) return

    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/bunny/preview-embed?videoId=${videoId}`)
      const data = await res.json()
      setPreviewUrl(data.embedUrl)
      paywallTimerRef.current = setTimeout(() => setPaywallVisible(true), 7000)
    } finally {
      setPreviewLoading(false)
    }
  }, [previewLoading, previewUrl, videoId])

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
    if (!autoAdvance || !nextLesson) return

    const href = nextLesson.videoProviderId
      ? `/aula/bunny/${nextLesson.videoProviderId}`
      : `/aula/${nextLesson.id}`

    router.push(href)
  }, [autoAdvance, nextLesson, router])

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
    if (commentsVisible && canViewRestrictedContent) {
      void loadComments()
    }
  }, [canViewRestrictedContent, commentsVisible, loadComments])

  const submitComment = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!lessonId || !commentText.trim()) return

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
  }, [commentText, lessonId])

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

      <div className="container py-6 pb-24 md:pb-6">
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
              <h1 className="text-lg font-bold leading-snug md:text-xl">{title}</h1>
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
              className="relative -mx-8 w-[calc(100%+4rem)] overflow-hidden rounded-none bg-black shadow-xl md:mx-0 md:w-full md:rounded-xl"
              style={{ aspectRatio: "16/9" }}
            >
              {!isAccessible ? (
                <div className="absolute inset-0">
                  {previewImage && (
                    <img
                      src={previewImage}
                      alt={title}
                      className="absolute inset-0 h-full w-full object-cover"
                      draggable={false}
                    />
                  )}

                  {!previewUrl && !paywallVisible && (
                    <button
                      onClick={handlePreviewPlay}
                      disabled={previewLoading}
                      aria-label="Reproduzir vídeo"
                      className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40 disabled:cursor-wait"
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white shadow-2xl backdrop-blur transition-colors hover:bg-black/65">
                        {previewLoading ? (
                          <Loader2 className="h-7 w-7 animate-spin" />
                        ) : (
                          <Play className="h-7 w-7 fill-white" />
                        )}
                      </span>
                    </button>
                  )}

                  {previewUrl && !paywallVisible && (
                    <iframe
                      src={previewUrl}
                      className="absolute inset-0 h-full w-full"
                      width="100%"
                      height="100%"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      title={title}
                    />
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
              ) : mounted ? (
                <iframe
                  src={embedUrl}
                  className="absolute inset-0 h-full w-full"
                  width="100%"
                  height="100%"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={title}
                />
              ) : null}
            </div>

            {isAccessible && lessonId && (
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
            )}

            {!canViewRestrictedContent ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/20 px-5 py-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Descrição completa da aula</p>
                  <p className="text-xs text-muted-foreground">
                    Assine um plano para ver a descrição, materiais e conteúdo exclusivo desta aula.
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link href="/planos">Ver planos</Link>
                </Button>
              </div>
            ) : (description || materials.length > 0) && (
              <div className="space-y-4 rounded-xl border border-border bg-muted/30 px-5 py-4">
                {description && (
                  <div className="space-y-1.5">
                    <h2 className="text-sm font-semibold">Descrição</h2>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
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

            <div>
              <h2 id="aula-comments" className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Comentários
                {comments.length > 0 && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                    {comments.length}
                  </span>
                )}
              </h2>

              {!canViewRestrictedContent ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/20 px-5 py-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Participe da discussão</p>
                    <p className="text-xs text-muted-foreground">
                      Assine um plano para acessar os comentários e participar das discussões desta aula.
                    </p>
                  </div>
                  <Button size="sm" asChild>
                    <Link href="/planos">Ver planos</Link>
                  </Button>
                </div>
              ) : !commentsVisible ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/20 px-5 py-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Participe da discussão</p>
                    <p className="text-xs text-muted-foreground">
                      Carregue os comentários para acompanhar a conversa da aula e deixar sua dúvida.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setCommentsVisible(true)}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Carregar comentários
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <form onSubmit={submitComment} className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="space-y-3">
                      <textarea
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        placeholder="Deixe sua dúvida ou comentário sobre esta aula..."
                        rows={4}
                        className="w-full rounded-lg border border-border bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
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
                          Publicar comentário
                        </Button>
                      </div>
                    </div>
                  </form>

                  {commentsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/10 px-5 py-8 text-center">
                      <p className="text-sm text-muted-foreground">Seja o primeiro a comentar nesta aula.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="rounded-xl border border-border bg-muted/15 p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
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
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
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
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
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
              )}
            </div>
          </div>

          <aside className="sticky top-20 hidden max-h-[calc(100vh-5rem)] w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-border lg:flex xl:w-80">
            <div className="border-b border-border bg-muted/50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trilha de aprendizado
              </p>
              <p className="mt-0.5 text-sm font-semibold">{courseTitle}</p>
            </div>

            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
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
                      <div className="border-b border-border/40 bg-muted/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          )}
                        >
                          <div className="relative aspect-video w-[76px] shrink-0 overflow-hidden rounded bg-zinc-800">
                            {thumb && (
                              <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
                            )}
                            {isCurrent && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
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
            <Sparkles className="h-[18px] w-[18px]" />
            <span className="text-[10px] font-medium">Perguntar</span>
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
                              <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
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
