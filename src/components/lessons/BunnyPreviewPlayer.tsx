"use client"

import Script from "next/script"
import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Play } from "lucide-react"

interface PlayerJsInstance {
  on(event: "ended", callback: () => void): void
  off?(event: "ended", callback: () => void): void
}

interface PlayerJsNamespace {
  Player: new (element: HTMLIFrameElement) => PlayerJsInstance
}

export function BunnyEmbedPlayer({
  embedUrl,
  title,
  onEnded,
}: {
  embedUrl: string
  title: string
  onEnded: () => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const onEndedRef = useRef(onEnded)
  const [scriptReady, setScriptReady] = useState(false)

  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  useEffect(() => {
    if (!scriptReady || !iframeRef.current) return

    const playerJs = (
      window as typeof window & { playerjs?: PlayerJsNamespace }
    ).playerjs

    if (!playerJs) return

    const player = new playerJs.Player(iframeRef.current)
    const handleEnded = () => onEndedRef.current()

    player.on("ended", handleEnded)
    return () => {
      if (!iframeRef.current?.contentWindow) return

      try {
        player.off?.("ended", handleEnded)
      } catch {
        // O iframe pode ser desmontado durante uma navegação.
      }
    }
  }, [embedUrl, scriptReady])

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

  useEffect(() => {
    setStarted(false)
    setEmbedUrl(null)
    setLoading(false)
    setUnavailable(false)
  }, [lessonId])

  useEffect(() => {
    if (!started) return

    const controller = new AbortController()

    async function loadPreview() {
      setLoading(true)
      setUnavailable(false)

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
  }, [lessonId, started])

  return (
    <div className="absolute inset-0 bg-black">
      {thumbnail && !embedUrl && (
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

      {embedUrl && (
        <BunnyEmbedPlayer
          embedUrl={embedUrl}
          title={`Prévia: ${title}`}
          onEnded={onEnded}
        />
      )}
    </div>
  )
}
