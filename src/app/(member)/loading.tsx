// Generic loading skeleton for member area routes (meus-cursos, curso/[slug])
// Dashboard uses its own loading.tsx at (member)/dashboard/loading.tsx
export default function MemberLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6 animate-pulse">
      {/* Page title */}
      <div className="h-7 w-44 rounded bg-zinc-800" />
      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <div className="aspect-video bg-zinc-800" />
            <div className="p-3 space-y-2">
              <div className="h-3.5 w-4/5 rounded bg-zinc-700" />
              <div className="h-3 w-2/5 rounded bg-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
