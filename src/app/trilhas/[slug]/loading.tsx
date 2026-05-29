export default function TrailLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Header placeholder */}
      <div className="h-14 border-b border-zinc-800/60 bg-zinc-950/80" />

      {/* Hero section skeleton */}
      <section className="relative min-h-[60vh] pb-44 md:pb-0 md:min-h-[92vh] flex items-start md:items-center overflow-hidden">
        {/* Background shimmer */}
        <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 from-[10%] via-zinc-950/45 via-[45%] to-transparent to-[70%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 from-[0%] via-zinc-950/30 via-[15%] to-transparent to-[35%]" />

        {/* Content skeleton */}
        <div className="relative z-10 w-full pt-16 px-10 md:pt-0 md:px-0 md:pl-44 lg:pl-64">
          <div className="max-w-[520px] space-y-4 animate-pulse">
            {/* Back button */}
            <div className="h-7 w-20 rounded-full bg-zinc-800" />

            {/* Badge */}
            <div className="h-6 w-44 rounded-full bg-zinc-800" />

            {/* Title */}
            <div className="space-y-3">
              <div className="h-12 w-4/5 rounded-lg bg-zinc-800" />
              <div className="h-12 w-3/5 rounded-lg bg-zinc-800" />
            </div>

            {/* Description */}
            <div className="space-y-2 pt-1">
              <div className="h-4 w-full rounded bg-zinc-800" />
              <div className="h-4 w-4/5 rounded bg-zinc-800" />
              <div className="h-4 w-2/3 rounded bg-zinc-800" />
            </div>

            {/* CTA button */}
            <div className="pt-1">
              <div className="h-12 w-40 rounded-xl bg-zinc-700" />
            </div>
          </div>
        </div>
      </section>

      {/* Content section — matches TrailViewClient: px-4 pb-16 md:px-8 lg:px-14 */}
      <div className="px-4 pb-16 md:px-8 lg:px-14 space-y-8 animate-pulse">

        {/* Module container 1 */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-4 md:p-6">
          {/* Module header button */}
          <div className="mb-4 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-zinc-700 shrink-0" />
              <div className="h-5 w-48 rounded bg-zinc-800" />
              <div className="h-4 w-16 rounded bg-zinc-800" />
            </div>
            <div className="h-5 w-5 rounded bg-zinc-800" />
          </div>
          {/* Lesson cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[12px] overflow-hidden bg-zinc-900 p-[1.2px]">
                <div className="relative aspect-video rounded-[11px] overflow-hidden bg-zinc-800">
                  <div className="absolute inset-x-0 bottom-0 p-2.5 space-y-1">
                    <div className="h-4 w-4/5 rounded bg-zinc-700" />
                    <div className="h-3 w-2/5 rounded bg-zinc-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module container 2 */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-zinc-700 shrink-0" />
              <div className="h-5 w-56 rounded bg-zinc-800" />
              <div className="h-4 w-14 rounded bg-zinc-800" />
            </div>
            <div className="h-5 w-5 rounded bg-zinc-800" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-[12px] overflow-hidden bg-zinc-900 p-[1.2px]">
                <div className="relative aspect-video rounded-[11px] overflow-hidden bg-zinc-800">
                  <div className="absolute inset-x-0 bottom-0 p-2.5 space-y-1">
                    <div className="h-4 w-3/4 rounded bg-zinc-700" />
                    <div className="h-3 w-1/3 rounded bg-zinc-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module container 3 */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-zinc-700 shrink-0" />
              <div className="h-5 w-40 rounded bg-zinc-800" />
              <div className="h-4 w-18 rounded bg-zinc-800" />
            </div>
            <div className="h-5 w-5 rounded bg-zinc-800" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[12px] overflow-hidden bg-zinc-900 p-[1.2px]">
                <div className="relative aspect-video rounded-[11px] overflow-hidden bg-zinc-800">
                  <div className="absolute inset-x-0 bottom-0 p-2.5 space-y-1">
                    <div className="h-4 w-4/5 rounded bg-zinc-700" />
                    <div className="h-3 w-2/5 rounded bg-zinc-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
