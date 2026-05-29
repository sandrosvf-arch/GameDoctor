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

      {/* Cards grid skeleton */}
      <div className="relative z-10 -mt-36 md:-mt-32 px-6 md:px-10 lg:px-14 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-pulse">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-[12px] overflow-hidden bg-zinc-900">
              <div className="aspect-video bg-zinc-800" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 w-4/5 rounded bg-zinc-700" />
                <div className="h-3 w-2/5 rounded bg-zinc-700" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
