export default function PlanosLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="h-14 border-b border-zinc-800/60 bg-zinc-950/80" />
      <main className="max-w-6xl mx-auto px-4 py-16 space-y-12">
        {/* Title */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-64 rounded-lg bg-zinc-800" />
          <div className="h-4 w-80 rounded bg-zinc-800" />
        </div>
        {/* 3 plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[false, true, false].map((highlight, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-7 flex flex-col gap-5 ${
                highlight
                  ? "border-cyan-500/30 bg-gradient-to-b from-cyan-500/5 to-transparent"
                  : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              <div className="h-5 w-28 rounded bg-zinc-800" />
              <div className="h-9 w-24 rounded bg-zinc-700" />
              <div className="h-3 w-36 rounded bg-zinc-800" />
              <div className="space-y-3 flex-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-zinc-700 shrink-0" />
                    <div className="h-4 flex-1 rounded bg-zinc-800" style={{ width: `${70 + j * 6}%` }} />
                  </div>
                ))}
              </div>
              <div className="h-10 w-full rounded-lg bg-zinc-700" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
