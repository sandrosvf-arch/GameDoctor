export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Header placeholder */}
      <div className="h-14 border-b border-zinc-800/60 bg-zinc-950/80" />

      {/* Hero banner skeleton */}
      <section className="relative min-h-[85vh] flex items-end overflow-hidden animate-pulse">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 from-[10%] via-zinc-950/40 to-transparent to-[65%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 from-[0%] via-zinc-950/25 via-[20%] to-transparent to-[40%]" />
        <div className="relative z-10 w-full px-6 md:px-14 lg:px-20 pb-16 space-y-4 max-w-[560px]">
          <div className="h-5 w-32 rounded-full bg-zinc-800" />
          <div className="space-y-3">
            <div className="h-12 w-4/5 rounded-lg bg-zinc-800" />
            <div className="h-12 w-3/5 rounded-lg bg-zinc-800" />
          </div>
          <div className="h-4 w-3/4 rounded bg-zinc-800" />
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-36 rounded-xl bg-zinc-700" />
            <div className="h-11 w-28 rounded-xl bg-zinc-800" />
          </div>
        </div>
      </section>

      {/* Trail rows skeleton */}
      <div className="space-y-10 py-8">
        {Array.from({ length: 3 }).map((_, r) => (
          <div key={r} className="animate-pulse">
            {/* Row header */}
            <div className="px-4 md:px-8 lg:px-14 mb-3 flex items-center gap-3">
              <div className="h-6 w-2 rounded-full bg-zinc-700" />
              <div className="h-5 w-48 rounded bg-zinc-800" />
              <div className="ml-auto h-4 w-16 rounded bg-zinc-800" />
            </div>
            {/* Cards */}
            <div className="flex gap-3 px-4 md:px-8 lg:px-14 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[280px] md:w-[320px] lg:w-[360px] rounded-[12px] overflow-hidden bg-zinc-900"
                >
                  <div className="aspect-video bg-zinc-800" />
                  <div className="p-3 space-y-2">
                    <div className="h-3.5 w-4/5 rounded bg-zinc-700" />
                    <div className="h-3 w-2/5 rounded bg-zinc-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
