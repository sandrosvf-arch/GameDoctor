import { Loader2 } from "lucide-react"

export default function CommunityForumLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_0%,rgba(249,115,22,0.08),transparent_28%),radial-gradient(circle_at_92%_8%,rgba(14,165,233,0.07),transparent_26%),#080b10] text-slate-100">
      <main className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-8">
        <section className="overflow-hidden rounded-2xl border border-orange-400/15 bg-[#0c1017] p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-7 h-9 w-72 max-w-full animate-pulse rounded bg-gradient-to-r from-orange-400/15 to-cyan-400/10" />
          <div className="mt-4 h-4 w-[32rem] max-w-full animate-pulse rounded bg-white/[0.05]" />
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-orange-400/15 bg-[#0c1017]">
          <div className="flex items-center gap-3 border-b border-orange-400/10 px-5 py-4 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-orange-300" />
            Carregando tópicos da comunidade...
          </div>
          {[0, 1, 2].map((item) => (
            <div key={item} className="border-b border-white/[0.06] px-5 py-5 last:border-b-0">
              <div className="h-4 w-2/5 animate-pulse rounded bg-white/[0.07]" />
              <div className="mt-3 h-3 w-1/4 animate-pulse rounded bg-white/[0.04]" />
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
