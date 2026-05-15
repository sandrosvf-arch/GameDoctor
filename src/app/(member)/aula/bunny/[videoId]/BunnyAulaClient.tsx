'use client'

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  MessageSquare,
  Play,
  User2,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false })

interface BunnyAulaClientProps {
  videoId: string
  title: string
  subtitle: string | null
  duration: string | null
  previewImage: string | null
  playbackUrl: string
  isAccessible: boolean
  isFree: boolean
  courseTitle: string
}

function PaywallOverlay({ videoId }: { videoId: string }) {
  return (
    <>
      <div
        className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/60 px-6 text-center backdrop-blur-[1px] animate-in fade-in duration-500"
      >
        <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-zinc-950/70 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-center gap-2 text-white">
            <Play className="h-4 w-4 fill-white" />
            <p className="text-base font-semibold">Continue assistindo</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            Entre para a maior e mais completa plataforma de formação de téncicos em videogames do Brasil
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
      <style jsx global>{`
        .cta-shine {
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }

        .cta-shine-pass {
          animation: cta-shine-pass 2.2s ease-in-out infinite;
        }

        @keyframes cta-shine-pass {
          0% {
            left: -60%;
            opacity: 0;
          }

          15% {
            opacity: 0.9;
          }

          45% {
            left: 110%;
            opacity: 0;
          }

          100% {
            left: 110%;
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}

export default function BunnyAulaClient({
  videoId,
  title,
  subtitle,
  duration,
  previewImage,
  playbackUrl,
  isAccessible,
  isFree,
  courseTitle,
}: BunnyAulaClientProps) {
  const [paywallVisible, setPaywallVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [started, setStarted] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const showPaywall = useCallback(() => {
    const video = document.querySelector("video")
    if (video instanceof HTMLVideoElement) {
      video.pause()
    }
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setPaywallVisible(true)
  }, [])

  useEffect(() => {
    if (!mounted || isAccessible || paywallVisible) return

    pollRef.current = setInterval(() => {
      const video = document.querySelector("video")
      if (!(video instanceof HTMLVideoElement)) return
      if (video.currentTime >= 7) {
        showPaywall()
      }
    }, 300)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [isAccessible, mounted, paywallVisible, showPaywall])

  const handleProgress = useCallback((state: { playedSeconds?: number }) => {
    if (isAccessible || paywallVisible) return
    if ((state.playedSeconds ?? 0) >= 7) {
      showPaywall()
    }
  }, [isAccessible, paywallVisible, showPaywall])

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="border-b border-border/50 bg-muted/30">
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

      <div className="container py-6">
        <div className="flex items-start gap-6">
          <div className="flex-1 min-w-0 space-y-6">
            <div
              className="relative w-full overflow-hidden rounded-xl bg-black shadow-xl"
              style={{ aspectRatio: "16/9" }}
            >
              {paywallVisible && <PaywallOverlay videoId={videoId} />}
              {mounted ? (
                <ReactPlayer
                  url={playbackUrl}
                  playing={started && !paywallVisible}
                  controls={!paywallVisible}
                  muted
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
                  onProgress={handleProgress}
                />
              ) : null}
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-snug">{title}</h1>
                <div className="mt-1 flex items-center gap-3">
                  {duration && (
                    <span className="text-sm text-muted-foreground">{duration}</span>
                  )}
                  {subtitle && (
                    <span className="text-sm text-muted-foreground">{subtitle}</span>
                  )}
                  {isAccessible ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-500">
                      {isFree ? "Grátis" : "Liberada"}
                    </span>
                  ) : (
                    <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-xs text-primary">
                      Prévia gratuita
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Início
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/cursos">
                    Ver mais aulas
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Comentários
              </h2>
              <div className="mb-6 flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <textarea
                    placeholder="Deixe sua dúvida ou comentário..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" asChild>
                      <Link href="/login">Entrar para comentar</Link>
                    </Button>
                  </div>
                </div>
              </div>
              <p className="py-6 text-center text-sm text-muted-foreground">
                Seja o primeiro a comentar nesta aula.
              </p>
            </div>
          </div>

          <aside className="sticky top-20 hidden max-h-[calc(100vh-5rem)] w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-border lg:flex xl:w-80">
            <div className="border-b border-border bg-muted/50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Conteúdo do curso
              </p>
              <p className="mt-0.5 text-sm font-semibold">{courseTitle}</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-start gap-3 border-l-2 border-primary bg-primary/10 px-4 py-2.5 text-sm text-primary">
                <Play className="mt-0.5 h-4 w-4 shrink-0 fill-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate leading-snug">{title}</p>
                  {duration && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{duration}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 border-l-2 border-transparent px-4 py-2.5 text-sm text-muted-foreground opacity-50">
                <Circle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate leading-snug">Próximas aulas em breve...</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}