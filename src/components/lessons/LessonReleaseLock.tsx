"use client"

import { useEffect, useRef, useState } from "react"
import { Clock3, LockKeyhole } from "lucide-react"
import { cn } from "@/lib/utils"

function getRemaining(releaseAt: string) {
  return Math.max(0, new Date(releaseAt).getTime() - Date.now())
}

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`
}

export function LessonReleaseLock({
  releaseAt,
  onReleased,
  className,
  compact = false,
}: {
  releaseAt: string
  onReleased?: () => void
  className?: string
  compact?: boolean
}) {
  const [remaining, setRemaining] = useState(() => getRemaining(releaseAt))
  const releasedRef = useRef(false)
  const onReleasedRef = useRef(onReleased)

  useEffect(() => {
    onReleasedRef.current = onReleased
  }, [onReleased])

  useEffect(() => {
    releasedRef.current = false
    const update = () => {
      const next = getRemaining(releaseAt)
      setRemaining(next)
      if (next === 0 && !releasedRef.current) {
        releasedRef.current = true
        onReleasedRef.current?.()
      }
    }

    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [releaseAt])

  if (compact) {
    return (
      <div className={cn("pointer-events-none absolute inset-0 z-10 flex items-end justify-center bg-black/55 p-2 text-center", className)}>
        <span className="rounded-full border border-cyan-300/30 bg-zinc-950/90 px-2.5 py-1 text-[10px] font-semibold text-cyan-200 shadow-lg">
          {remaining > 0 ? "Libera em " + formatRemaining(remaining) : "Disponível agora"}
        </span>
      </div>
    )
  }
  return (
    <div className={cn("absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/80 px-6 text-center backdrop-blur-sm", className)}>
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-cyan-400/25 bg-zinc-950/90 px-6 py-6 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-semibold text-white">Este vídeo será liberado em</p>
          <p className="mt-2 font-mono text-lg font-semibold tracking-wide text-cyan-300">
            {remaining > 0 ? formatRemaining(remaining) : "Liberando agora..."}
          </p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
            <Clock3 className="h-3.5 w-3.5" />
            Seu acesso está ativo. Aguarde a liberação desta aula.
          </p>
        </div>
      </div>
    </div>
  )
}