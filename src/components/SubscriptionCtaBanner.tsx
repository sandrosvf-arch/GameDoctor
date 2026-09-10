"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"

export function SubscriptionCtaBanner() {
  const pathname = usePathname()

  if (pathname?.startsWith("/aula/bunny/")) return null

  return (
    <>
      <aside className="pointer-events-none fixed right-4 top-1/2 z-[70] hidden -translate-y-1/2 lg:block">
        <Link
          href="/planos"
          className="pointer-events-auto flex w-56 flex-col gap-3 rounded-2xl border border-cyan-300/25 bg-[#0b1720]/95 p-4 text-left shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl transition hover:border-cyan-300/50 hover:bg-[#10232e]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-300">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>
            <strong className="block text-sm text-white">Assine aqui</strong>
            <span className="mt-1 block text-xs leading-5 text-slate-400">Desbloqueie o acesso completo à plataforma.</span>
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300">Ver planos <ArrowRight className="h-3.5 w-3.5" /></span>
        </Link>
      </aside>

      <aside className="pointer-events-none fixed inset-x-3 bottom-20 z-[70] flex justify-center lg:hidden">
        <Link
          href="/planos"
          className="pointer-events-auto flex min-h-11 w-full max-w-xs items-center gap-2 rounded-xl border border-cyan-300/30 bg-[#0b1720]/[.98] px-3 py-2 text-left shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-cyan-300" />
          <span className="min-w-0 flex-1">
            <strong className="block text-xs text-white">Assine aqui</strong>
            <span className="block truncate text-[10px] text-slate-400">Acesso completo à plataforma</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-cyan-300" />
        </Link>
      </aside>
    </>
  )
}
