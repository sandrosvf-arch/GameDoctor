export default function AulaLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Header bar */}
      <div className="h-14 border-b border-zinc-800 bg-zinc-900" />

      <div className="flex h-[calc(100vh-56px)]">
        {/* Video area */}
        <div className="flex flex-1 flex-col">
          <div className="aspect-video w-full bg-zinc-900" />
          <div className="p-6 space-y-3">
            <div className="h-6 w-2/3 rounded bg-zinc-800" />
            <div className="h-4 w-1/3 rounded bg-zinc-800" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden w-80 shrink-0 border-l border-zinc-800 bg-zinc-900/50 lg:flex flex-col gap-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-4 rounded-full bg-zinc-700 shrink-0" />
              <div className="h-4 flex-1 rounded bg-zinc-800" style={{ width: `${60 + (i % 3) * 10}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
