"use client"

import { usePathname } from "next/navigation"
import { useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Sparkles, X } from "lucide-react"

export function SubscriptionCtaBanner() {
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(false)
  const touchStartX = useRef<number | null>(null)

  if (
    dismissed
    || pathname?.startsWith("/aula/bunny/")
    || pathname === "/planos"
    || pathname?.startsWith("/checkout")
  ) return null

  function startSwipe(event: React.TouchEvent<HTMLElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  function finishSwipe(event: React.TouchEvent<HTMLElement>) {
    const startX = touchStartX.current
    touchStartX.current = null
    if (startX !== null && Math.abs((event.changedTouches[0]?.clientX ?? startX) - startX) > 56) {
      setDismissed(true)
    }
  }

  return (
    <aside
      className="pointer-events-none fixed inset-x-3 top-20 z-[70] flex justify-center sm:inset-x-auto sm:bottom-4 sm:left-4 sm:top-auto sm:justify-start"
      onTouchStart={startSwipe}
      onTouchEnd={finishSwipe}
    >
      <div className="pointer-events-auto relative w-full max-w-xs">
        <button type="button" onClick={() => setDismissed(true)} className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white" aria-label="Fechar aviso">
          <X className="h-3.5 w-3.5" />
        </button>
        <Link href="/planos" className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-cyan-300/30 bg-[#0b1720]/[.98] px-3.5 py-2.5 pr-9 text-left shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:border-cyan-300/50 hover:bg-[#10232e]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-300"><Sparkles className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><strong className="block text-xs text-white">Assine aqui</strong><span className="mt-0.5 block truncate text-[10px] text-slate-400">Acesso completo à plataforma</span></span>
          <ArrowRight className="h-4 w-4 shrink-0 text-cyan-300" />
        </Link>
      </div>
    </aside>
  )
}
