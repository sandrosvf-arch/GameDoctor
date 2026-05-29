'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
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
  SkipBack,
  SkipForward,
  Sparkles,
  User2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BUNNY_CDN_HOST } from "@/lib/constants"

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

function formatSecs(s: number | null | undefined): string | null {
  if (!s) return null
  const m = Math.floor(s / 60)
  const r = s % 60
  return r > 0 ? `${m}min ${r}s` : `${m}min`
}

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false })

interface BunnyAulaClientProps {
  videoId: string
  lessonId: string | null
  title: string
  subtitle: string | null
  duration: string | null
  previewImage: string | null
  playbackUrl: string
  isAccessible: boolean
  isFree: boolean
  courseTitle: string
  courseSlug: string | null
  description: string | null
  courseLessons: CourseLessonInfo[]
  nextLesson: CourseLessonInfo | null
  materials: LessonMaterial[]
  initialCompleted: boolean
}



export default function BunnyAulaClient({
  videoId,
  lessonId,
  title,
  subtitle,
  duration,
  previewImage,
  playbackUrl,
  isAccessible,
  isFree,
  courseTitle,
  courseSlug,
  description,
  courseLessons,
  nextLesson,
  materials,
  initialCompleted,
}: BunnyAulaClientProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [paywallVisible, setPaywallVisible] = useState(false)
  const [started, setStarted] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [completed, setCompleted] = useState(initialCompleted)
  const [completingLesson, setCompletingLesson] = useState(false)
  const [listOpen, setListOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    setStarted(false)
    setPaywallVisible(false)
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
    const saved = localStorage.getItem("gamedoctor_autoadvance")
    if (saved === "1") setAutoAdvance(true)
  }, [videoId])

  const handleMarkComplete = useCallback(async () => {
    if (!lessonId || completingLesson) return
    setCompletingLesson(true)
    const next = !completed
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, watchedSeconds: 0, completed: next }),
      })
      setCompleted(next)
    } finally {
      setCompletingLesson(false)
    }
  }, [lessonId, completed, completingLesson])

  const toggleAutoAdvance = useCallback(() => {
    setAutoAdvance(prev => {
      const next = !prev
      localStorage.setItem("gamedoctor_autoadvance", next ? "1" : "0")
      return next
    })
  }, [])

  const handleEnded = useCallback(() => {
    if (!autoAdvance || !nextLesson) return
    const href = nextLesson.videoProviderId
      ? `/aula/bunny/${nextLesson.videoProviderId}`
      : `/aula/${nextLesson.id}`
    router.push(href)
  }, [autoAdvance, nextLesson, router])

  // Group lessons by module
  const groupedLessons = useMemo(() => {
    const groups: { module: { id: string; title: string } | null; lessons: CourseLessonInfo[] }[] = []
    for (const l of courseLessons) {
      const key = l.moduleId ?? null
      const existing = groups.find(g => (g.module?.id ?? null) === key)
      if (existing) {
        existing.lessons.push(l)
      } else {
        groups.push({ module: l.module ?? null, lessons: [l] })
      }
    }
    return groups
  }, [courseLessons])

  const currentIdx = useMemo(
    () => courseLessons.findIndex(l => l.videoProviderId === videoId),
    [courseLessons, videoId]
  )
  const handleProgress = useCallback((state: { playedSeconds?: number }) => {
    if ((state.playedSeconds ?? 0) >= 7) {
      setPaywallVisible(true)
    }
  }, [])

  const prevLesson = currentIdx > 0 ? courseLessons[currentIdx - 1] : null

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block border-b border-border/50 bg-muted/30">
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
          <div className="flex-1 min-w-0 space-y-6">
            {/* Mobile: back button */}
            <button
              onClick={() => router.back()}
              className="flex md:hidden items-center gap-1.5 text-sm text-zinc-400 active:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            {/* Title */}
            <h1 className="text-lg md:text-xl font-bold leading-snug">{title}</h1>

            <div
              className="relative w-[calc(100%+4rem)] md:w-full -mx-8 md:mx-0 overflow-hidden rounded-none md:rounded-xl bg-black shadow-xl"
              style={{ aspectRatio: "16/9" }}
            >
              {(!isAccessible && paywallVisible) ? (
                // Paywall — ReactPlayer desmontado, nenhum <video> no DOM
                <div className="absolute inset-0">
                  {previewImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImage}
                      alt={title}
                      className="absolute inset-0 h-full w-full object-cover"
                      draggable={false}
                    />
                  )}
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-6 text-center backdrop-blur-[1px] animate-in fade-in duration-500">
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
                </div>
              ) : mounted ? (
                <ReactPlayer
                  url={playbackUrl}
                  playing={started}
                  controls={isAccessible}
                  playsInline
                  config={{ file: { attributes: { playsInline: true, 'webkit-playsinline': true } } }}
                  light={previewImage ?? true}
                  playIcon={
                    <button
                      type="button"
                      aria-label="Reproduzir vídeo"
                      className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white shadow-2xl backdrop-blur hover:bg-black/60"
                    >
                      <Play className="h-7 w-7 fill-white" />
                    </button>
                  }
                  width="100%"
                  height="100%"
                  className="absolute inset-0"
                  onClickPreview={() => setStarted(true)}
                  onProgress={!isAccessible ? handleProgress : undefined}
                  onEnded={handleEnded}
                />
              ) : null}
            </div>

            {/* Concluir */}
            {isAccessible && lessonId && (
              <button
                onClick={handleMarkComplete}
                disabled={completingLesson}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl h-11 text-sm font-semibold border transition-colors disabled:opacity-60",
                  completed
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                    : "border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-400"
                )}
              >
                {completingLesson
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4" />
                }
                {completed ? "Aula concluída" : "Concluir aula"}
              </button>
            )}

            {/* Description + Files */}
            {!isAccessible ? (
              <div className="rounded-xl border border-border bg-muted/20 px-5 py-6 flex flex-col items-center gap-3 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Descrição completa da aula</p>
                  <p className="text-xs text-muted-foreground">Assine um plano para ver a descrição, materiais e conteúdo exclusivo desta aula.</p>
                </div>
                <Button size="sm" asChild>
                  <Link href="/planos">Ver planos</Link>
                </Button>
              </div>
            ) : (description || materials.length > 0) && (
              <div className="rounded-xl border border-border bg-muted/30 px-5 py-4 space-y-4">
                {description && (
                  <div className="space-y-1.5">
                    <h2 className="text-sm font-semibold">Descrição</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{description}</p>
                  </div>
                )}

                {materials.length > 0 && (
                  <div className={description ? "border-t border-border/50 pt-4 space-y-2" : "space-y-2"}>
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      Arquivos da aula
                    </h2>
                    <div className="space-y-2">
                      {materials.map(m => {
                        const url = m.externalUrl ?? m.fileUrl ?? "#"
                        const Icon = m.type === "PDF" ? FileText
                          : m.type === "SPREADSHEET" ? FileSpreadsheet
                          : m.type === "LINK" ? Link2
                          : Paperclip
                        return (
                          <a
                            key={m.id}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-4 py-3 text-sm transition-colors hover:bg-muted/60"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate">{m.title}</span>
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
              </h2>
              <div className="rounded-xl border border-border bg-muted/20 px-5 py-6 flex flex-col items-center gap-3 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {isAccessible
                    ? <User2 className="h-5 w-5 text-muted-foreground" />
                    : <Lock className="h-5 w-5 text-muted-foreground" />
                  }
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Participe da discussão</p>
                  <p className="text-xs text-muted-foreground">
                    {isAccessible
                      ? "Faça login para deixar sua dúvida ou comentário nesta aula."
                      : "Assine um plano para acessar os comentários e participar das discussões."
                    }
                  </p>
                </div>
                <Button size="sm" asChild>
                  {isAccessible
                    ? <Link href="/login">Entrar para comentar</Link>
                    : <Link href="/planos">Ver planos</Link>
                  }
                </Button>
              </div>
            </div>
          </div>

          <aside className="sticky top-20 hidden max-h-[calc(100vh-5rem)] w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-border lg:flex xl:w-80">
            {/* Header */}
            <div className="border-b border-border bg-muted/50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trilha de aprendizado
              </p>
              <p className="mt-0.5 text-sm font-semibold">{courseTitle}</p>
            </div>

            {/* Auto-advance toggle */}
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
                <span className={cn(
                  "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  autoAdvance ? "translate-x-4" : "translate-x-0.5"
                )} />
              </button>
            </div>

            {/* Lesson list */}
            <div className="flex-1 overflow-y-auto">
              {groupedLessons.length === 0 ? (
                <p className="px-4 py-4 text-xs text-muted-foreground">Nenhuma aula encontrada.</p>
              ) : (
                groupedLessons.map(({ module: mod, lessons: modLessons }) => (
                  <div key={mod?.id ?? "no-module"}>
                    {mod && (
                      <div className="border-b border-border/40 bg-muted/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {mod.title}
                      </div>
                    )}
                    {modLessons.map(l => {
                      const isCurrent = l.videoProviderId === videoId
                      const href = l.videoProviderId
                        ? `/aula/bunny/${l.videoProviderId}`
                        : `/aula/${l.id}`
                      const dur = formatSecs(l.videoDurationSeconds ?? l.durationSeconds)
                      const thumb = l.thumbnail
                        ?? (l.videoProviderId ? `https://${BUNNY_CDN_HOST}/${l.videoProviderId}/thumbnail.jpg` : null)
                        ?? l.videoThumbnailUrl
                      return (
                        <Link
                          key={l.id}
                          href={href}
                          className={cn(
                            "flex items-center gap-2.5 border-l-2 px-3 py-2 text-sm transition-colors",
                            isCurrent
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          )}
                        >
                          {/* Thumbnail */}
                          <div className="relative shrink-0 w-[76px] aspect-video rounded overflow-hidden bg-zinc-800">
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
                            <p className="truncate text-sm leading-snug font-medium">{l.title}</p>
                            {dur && <p className="mt-0.5 text-xs text-muted-foreground">{dur}</p>}
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

      {/* ── Mobile: floating pill navbar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-none">
        <div className="pointer-events-auto mx-4 mb-5 flex items-center justify-around rounded-2xl bg-zinc-900 border border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.6)] h-[60px] px-1">

          {/* Anterior */}
          {prevLesson ? (
            <Link
              href={prevLesson.videoProviderId ? `/aula/bunny/${prevLesson.videoProviderId}` : `/aula/${prevLesson.id}`}
              className="flex flex-col items-center justify-center gap-0.5 w-[19%] h-full text-zinc-300 active:text-white transition-colors"
            >
              <SkipBack className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">Anterior</span>
            </Link>
          ) : (
            <span className="flex flex-col items-center justify-center gap-0.5 w-[19%] h-full text-zinc-700 cursor-not-allowed select-none">
              <SkipBack className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">Anterior</span>
            </span>
          )}

          {/* Trilha (mobile) */}
          {courseSlug ? (
            <Link
              href={`/trilhas/${courseSlug}`}
              className="flex flex-col items-center justify-center gap-0.5 w-[19%] h-full text-zinc-300 active:text-white transition-colors"
            >
              <List className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">Trilha</span>
            </Link>
          ) : (
            <button
              onClick={() => setListOpen(v => !v)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-[19%] h-full transition-colors active:opacity-70",
                listOpen ? "text-primary" : "text-zinc-300"
              )}
            >
              <List className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">Lista</span>
            </button>
          )}

          {/* Perguntar */}
          <button
            onClick={() => document.getElementById('aula-comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="flex flex-col items-center justify-center gap-0.5 w-[19%] h-full text-zinc-300 active:text-white transition-colors"
          >
            <Sparkles className="h-[18px] w-[18px]" />
            <span className="text-[10px] font-medium">Perguntar</span>
          </button>

          {/* Auto-advance */}
          <button
            onClick={toggleAutoAdvance}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 w-[19%] h-full transition-colors active:opacity-70",
              autoAdvance ? "text-primary" : "text-zinc-300"
            )}
          >
            <Repeat className="h-[18px] w-[18px]" />
            <span className="text-[10px] font-medium">Auto</span>
          </button>

          {/* Próximo */}
          {nextLesson ? (
            <Link
              href={nextLesson.videoProviderId ? `/aula/bunny/${nextLesson.videoProviderId}` : `/aula/${nextLesson.id}`}
              className="flex flex-col items-center justify-center gap-0.5 w-[19%] h-full text-zinc-300 active:text-white transition-colors"
            >
              <SkipForward className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">Próximo</span>
            </Link>
          ) : (
            <span className="flex flex-col items-center justify-center gap-0.5 w-[19%] h-full text-zinc-700 cursor-not-allowed select-none">
              <SkipForward className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">Próximo</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Mobile: lesson list sheet ── */}
      {listOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setListOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 flex flex-col bg-zinc-900 rounded-t-2xl max-h-[78vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trilha de aprendizado</p>
                <p className="text-sm font-semibold mt-0.5">{courseTitle}</p>
              </div>
              <button onClick={() => setListOpen(false)} className="p-1 text-zinc-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pb-4">
              {groupedLessons.length === 0 ? (
                <p className="px-4 py-4 text-xs text-muted-foreground">Nenhuma aula encontrada.</p>
              ) : (
                groupedLessons.map(({ module: mod, lessons: modLessons }) => (
                  <div key={mod?.id ?? "no-module"}>
                    {mod && (
                      <div className="border-b border-border/40 bg-muted/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {mod.title}
                      </div>
                    )}
                    {modLessons.map(l => {
                      const isCurrent = l.videoProviderId === videoId
                      const dur = formatSecs(l.videoDurationSeconds ?? l.durationSeconds)
                      const thumb = l.thumbnail
                        ?? (l.videoProviderId ? `https://${BUNNY_CDN_HOST}/${l.videoProviderId}/thumbnail.jpg` : null)
                        ?? l.videoThumbnailUrl
                      return (
                        <Link
                          key={l.id}
                          href={l.videoProviderId ? `/aula/bunny/${l.videoProviderId}` : `/aula/${l.id}`}
                          onClick={() => setListOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 border-l-2 px-3 py-2.5 transition-colors",
                            isCurrent
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-transparent text-muted-foreground active:bg-muted/40"
                          )}
                        >
                          <div className="relative shrink-0 w-[72px] aspect-video rounded overflow-hidden bg-zinc-800">
                            {thumb && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
                            )}
                            {isCurrent && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <Play className="h-3.5 w-3.5 fill-white text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm leading-snug font-medium">{l.title}</p>
                            {dur && <p className="mt-0.5 text-xs text-muted-foreground">{dur}</p>}
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