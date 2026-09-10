import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function SubscriptionCta() {
  const session = await auth()
  const role = session?.user?.role

  if (role === "ADMIN" || role === "EDITOR") return null

  if (session?.user?.id) {
    const now = new Date()
    const activeAccess = await db.accessPermission.findFirst({
      where: {
        userId: session.user.id,
        planId: { not: null },
        status: "ACTIVE",
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    })

    if (activeAccess) return null
  }

  return (
    <aside className="fixed inset-x-4 bottom-4 z-40 flex justify-center pointer-events-none sm:justify-start lg:left-4 lg:right-auto">
      <Link
        href="/planos"
        className="pointer-events-auto flex min-h-12 w-full max-w-sm items-center gap-3 rounded-2xl border border-cyan-300/25 bg-[#0b1720]/95 px-4 py-3 text-left shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:border-cyan-300/50 hover:bg-[#10232e]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-300">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm text-white">Assine aqui</strong>
          <span className="block truncate text-xs text-slate-400">Desbloqueie o acesso completo à plataforma.</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-cyan-300" />
      </Link>
    </aside>
  )
}
