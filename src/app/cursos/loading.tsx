export default function CursosLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="h-14 border-b border-zinc-800/60 bg-zinc-950/80" />

      <main className="px-4 md:px-8 lg:px-14 py-12 space-y-12 animate-pulse">
        {/* Page title */}
        <div className="h-8 w-48 rounded-lg bg-zinc-800" />

        {/* Section 1 */}
        {Array.from({ length: 3 }).map((_, s) => (
          <section key={s} className="space-y-4">
            <div className="h-6 w-36 rounded bg-zinc-800" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden bg-zinc-900">
                  <div className="aspect-video bg-zinc-800" />
                  <div className="p-3 space-y-2">
                    <div className="h-3.5 w-4/5 rounded bg-zinc-700" />
                    <div className="h-3 w-2/5 rounded bg-zinc-700" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
