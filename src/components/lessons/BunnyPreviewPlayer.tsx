"use client"

import Script from "next/script"
import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Play } from "lucide-react"

interface PlayerJsTimeUpdate {
  seconds?: number
  currentTime?: number
}

type PlayerJsEvent = "ended" | "ready" | "play" | "pause" | "timeupdate"

interface PlayerJsInstance {
  on(event: PlayerJsEvent, callback: (data?: PlayerJsTimeUpdate) => void): void
  off?(event: PlayerJsEvent, callback: (data?: PlayerJsTimeUpdate) => void): void
  play(): void
}

interface PlayerJsNamespace {
  Player: new (element: HTMLIFrameElement) => PlayerJsInstance
}

export function BunnyEmbedPlayer({
  embedUrl,
  title,
  onEnded,
  onProgress,
  autoPlayRetry = false,
}: {
  embedUrl: string
  title: string
  onEnded: () => void
  onProgress?: (playedSeconds: number) => void
  autoPlayRetry?: boolean
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const onEndedRef = useRef(onEnded)
  const onProgressRef = useRef(onProgress)
  const [scriptReady, setScriptReady] = useState(false)

  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  useEffect(() => {
    if (!scriptReady || !iframeRef.current) return

    const playerJs = (
      window as typeof window & { playerjs?: PlayerJsNamespace }
    ).playerjs

    if (!playerJs) return

    const player = new playerJs.Player(iframeRef.current)
    const handleEnded = () => onEndedRef.current()
    const handleTimeUpdate = (data?: PlayerJsTimeUpdate) => {
      const playedSeconds = data?.seconds ?? data?.currentTime
      if (typeof playedSeconds === "number") {
        onProgressRef.current?.(playedSeconds)
      }
    }

    player.on("ended", handleEnded)
    if (onProgressRef.current) player.on("timeupdate", handleTimeUpdate)

    // The `autoplay=true` URL param occasionally races with the source/manifest
    // still resolving and silently fails. Track real play/pause state (never call
    // play() while already playing, that toggles it back to paused) and retry a
    // couple of times only while still paused.
    let isPlaying = false
    const retryTimers: number[] = []
    const handlePlay = () => { isPlaying = true }
    const handlePause = () => { isPlaying = false }
    const handleReady = () => {
      const attemptPlay = () => {
        if (isPlaying) return
        try {
          player.play()
        } catch {
          // Ignore; the player's own play button remains available as a fallback.
        }
      }

      retryTimers.push(window.setTimeout(attemptPlay, 600))
      retryTimers.push(window.setTimeout(attemptPlay, 1600))
    }

    if (autoPlayRetry) {
      player.on("play", handlePlay)
      player.on("pause", handlePause)
      player.on("ready", handleReady)
    }

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer))
      if (!iframeRef.current?.contentWindow) return

      try {
        player.off?.("ended", handleEnded)
        if (onProgressRef.current) {
          player.off?.("timeupdate", handleTimeUpdate)
        }
        if (autoPlayRetry) {
          player.off?.("play", handlePlay)
          player.off?.("pause", handlePause)
          player.off?.("ready", handleReady)
        }
      } catch {
        // O iframe pode ser desmontado durante uma navegação.
      }
    }
  }, [embedUrl, scriptReady, autoPlayRetry])

  const handleScriptReady = useCallback(() => {
    setScriptReady(true)
  }, [])

  return (
    <>
      <Script
        id="bunny-playerjs"
        src="https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js"
        strategy="afterInteractive"
        onLoad={handleScriptReady}
        onReady={handleScriptReady}
      />
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="absolute inset-0 h-full w-full brightness-[1.2]"
        width="100%"
        height="100%"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        title={title}
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </>
  )
}

export function BunnyPreviewPlayer({
  lessonId,
  title,
  thumbnail,
  onEnded,
}: {
  lessonId: string
  title: string
  thumbnail: string | null
  onEnded: () => void
}) {
  const [started, setStarted] = useState(false)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  // Fetch the signed preview URL as soon as the lesson is known, so the click that
  // starts playback mounts the iframe synchronously (same-gesture autoplay works).
  useEffect(() => {
    setStarted(false)
    setEmbedUrl(null)
    setUnavailable(false)
    setLoading(true)

    const controller = new AbortController()

    async function loadPreview() {
      try {
        const response = await fetch(
          `/api/bunny/preview-embed?lessonId=${encodeURIComponent(lessonId)}`,
          { cache: "no-store", signal: controller.signal }
        )
        const data = await response.json().catch(() => null)

        if (!response.ok || typeof data?.embedUrl !== "string") {
          setUnavailable(true)
          return
        }

        setEmbedUrl(data.embedUrl)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setUnavailable(true)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadPreview()
    return () => controller.abort()
  }, [lessonId])

  return (
    <div className="absolute inset-0 bg-black">
      {thumbnail && !started && (
        <img
          src={thumbnail}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover brightness-[1.2]"
          draggable={false}
        />
      )}

      {!started && (
        <button
          type="button"
          onClick={() => setStarted(true)}
          aria-label="Assistir prévia"
          className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/20"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white shadow-2xl backdrop-blur transition-colors hover:bg-black/65">
            <Play className="h-7 w-7 fill-white" />
          </span>
        </button>
      )}

      {started && loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {unavailable && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/85 px-6 text-center">
          <Play className="h-12 w-12 text-zinc-600" />
          <p className="text-sm text-zinc-300">Prévia indisponível no momento.</p>
        </div>
      )}

      {started && embedUrl && (
        <BunnyEmbedPlayer
          embedUrl={embedUrl}
          title={`Prévia: ${title}`}
          onEnded={onEnded}
          autoPlayRetry
        />
      )}
    </div>
  )
}
