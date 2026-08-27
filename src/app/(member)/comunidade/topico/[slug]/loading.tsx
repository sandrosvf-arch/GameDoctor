import { Loader2 } from "lucide-react"

export default function CommunityTopicLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(249,115,22,0.08),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(34,211,238,0.06),transparent_25%),#080b10] text-slate-100">
      <section className="border-b border-orange-400/10 bg-[#0c111a]">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-8">
          <div className="h-4 w-52 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-6 h-9 w-[34rem] max-w-full animate-pulse rounded bg-gradient-to-r from-orange-400/15 to-cyan-400/10" />
          <div className="mt-5 h-4 w-80 max-w-full animate-pulse rounded bg-white/[0.05]" />
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-5 px-6 py-8 md:px-8">
        <div className="rounded-xl border border-orange-400/15 bg-[#0c1017] p-5">
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-orange-300" />
            Carregando tópico e respostas...
          </div>
          <div className="mt-7 grid gap-5 md:grid-cols-[170px_1fr]">
            <div className="h-40 animate-pulse rounded-lg bg-white/[0.04]" />
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-white/[0.06]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-white/[0.05]" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.04]" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
