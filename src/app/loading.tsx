export default function HomeLoading() {
  return (
    <div className="bg-zinc-950 text-white overflow-x-hidden">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="h-14 border-b border-zinc-800/60 bg-zinc-950/80" />

      {/* ── Hero banner ─────────────────────────────────────────
          Exact sizing from HeroBannerClient: min-h-[60vh] md:min-h-[92vh]
          Content: pt-10 px-10 md:pt-0 md:pl-44 lg:pl-64 max-w-[520px]
      ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[60vh] md:min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Background shimmer */}
        <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
        {/* Same gradients as real banner */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 from-[20%] via-zinc-950/60 via-[50%] to-transparent to-[75%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 from-[0%] via-zinc-950/50 via-[18%] to-transparent to-[40%]" />

        {/* Content — exact same positioning as HeroBannerClient */}
        <div className="relative z-10 w-full pt-10 px-10 md:pt-0 md:px-0 md:pl-44 lg:pl-64 animate-pulse">
          <div className="max-w-[520px] space-y-4">
            {/* Badge pill */}
            <div className="h-7 w-56 rounded-full bg-zinc-800 border border-zinc-700" />

            {/* Title — text-[2.4rem]→[3.6rem] font-black leading-[1.05] */}
            <div className="space-y-2">
              <div className="h-[2.4rem] sm:h-[2.8rem] md:h-[3.2rem] lg:h-[3.6rem] w-[90%] rounded-lg bg-zinc-800" />
              <div className="h-[2.4rem] sm:h-[2.8rem] md:h-[3.2rem] lg:h-[3.6rem] w-[65%] rounded-lg bg-zinc-800" />
            </div>

            {/* Subtitle — text-base md:text-lg max-w-[440px] */}
            <div className="max-w-[440px] space-y-2 pt-1">
              <div className="h-[1.125rem] md:h-[1.25rem] w-full rounded bg-zinc-800" />
              <div className="h-[1.125rem] md:h-[1.25rem] w-4/5 rounded bg-zinc-800" />
            </div>

            {/* CTA buttons — h-12 px-7 */}
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="h-12 w-36 rounded-[var(--radius)] bg-zinc-700" />
              <div className="h-12 w-36 rounded-[var(--radius)] bg-zinc-800 border border-zinc-700" />
            </div>
          </div>
        </div>

        {/* Slide progress bars — absolute bottom-6 center, h-[3px] w-16 */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 items-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-[3px] w-16 rounded-full ${i === 0 ? "bg-white/40" : "bg-white/20"}`} />
          ))}
        </div>

        {/* Nav arrows — absolute left/right center, md only */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 rounded-full border border-white/20 bg-black/40 items-center justify-center">
          <div className="h-5 w-5 rounded bg-zinc-700" />
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 rounded-full border border-white/20 bg-black/40 items-center justify-center">
          <div className="h-5 w-5 rounded bg-zinc-700" />
        </div>
      </section>

      {/* ── Trail rows ──────────────────────────────────────────
          section: pb-16 space-y-10 pt-2
          Cards: w-[280px] sm:w-[280px] md:w-[320px] lg:w-[360px] xl:w-[380px] 2xl:w-[460px]
          with p-[1.2px] gradient border + aspect-video inner
      ────────────────────────────────────────────────────────── */}
      <section className="pb-16 space-y-10 pt-2">
        {Array.from({ length: 3 }).map((_, r) => (
          <div key={r} className="animate-pulse">
            {/* Row header: px-4 md:px-8 lg:px-14 mb-3 flex items-baseline gap-3 */}
            <div className="px-4 md:px-8 lg:px-14 mb-3 flex items-baseline gap-3">
              {/* Color bar */}
              <div className="w-2 h-6 rounded-full bg-zinc-700 shrink-0" />
              {/* Row title — text-lg md:text-xl font-bold */}
              <div className="h-6 w-48 rounded bg-zinc-800" />
              {/* "Ver todos" link — ml-auto text-sm */}
              <div className="ml-auto h-4 w-16 rounded bg-zinc-800" />
            </div>

            {/* Rail — flex gap-3 px-4 md:px-8 lg:px-14 pb-3 */}
            <div className="flex gap-3 px-4 md:px-8 lg:px-14 pb-3 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[280px] sm:w-[280px] md:w-[320px] lg:w-[360px] xl:w-[380px] 2xl:w-[460px] rounded-[12px] overflow-hidden bg-zinc-900 p-[1.2px]"
                >
                  {/* Aspect-video card inner */}
                  <div className="aspect-video rounded-[11px] bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── Plans section ───────────────────────────────────────
          py-20 border-t border-zinc-900
          3-col grid, max-w-4xl mx-auto, rounded-2xl cards
      ────────────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-zinc-900 animate-pulse">
        <div className="container">
          {/* Title block */}
          <div className="flex flex-col items-center gap-3 mb-12">
            <div className="h-9 md:h-10 w-64 rounded-lg bg-zinc-800" />
            <div className="h-4 w-72 rounded bg-zinc-800" />
          </div>
          {/* 3 plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[false, true, false].map((highlight, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-7 flex flex-col gap-4 ${
                  highlight
                    ? "border-cyan-500/30 bg-gradient-to-b from-cyan-500/5 to-transparent"
                    : "border-zinc-800 bg-zinc-900/40"
                }`}
              >
                <div className="h-5 w-24 rounded bg-zinc-800" />
                <div className="h-8 w-20 rounded bg-zinc-700" />
                <div className="h-3 w-32 rounded bg-zinc-800" />
                <div className="space-y-2.5 flex-1">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-4 rounded bg-zinc-800" style={{ width: `${75 + j * 5}%` }} />
                  ))}
                </div>
                <div className="h-9 w-full rounded-lg bg-zinc-700" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ section ─────────────────────────────────────────
          py-20 border-t border-zinc-900, max-w-2xl
          Accordion items: rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4
      ────────────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-zinc-900 animate-pulse">
        <div className="container max-w-2xl space-y-2">
          <div className="h-7 w-56 rounded-lg bg-zinc-800 mx-auto mb-8" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
              <div className="h-4 rounded bg-zinc-800" style={{ width: `${65 + (i % 3) * 10}%` }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
