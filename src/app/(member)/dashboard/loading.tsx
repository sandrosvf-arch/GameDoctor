import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

      {/* Greeting */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="h-7 w-52 rounded bg-zinc-800" />
          <div className="h-4 w-72 rounded bg-zinc-700" />
        </div>
        <div className="h-7 w-44 rounded-full bg-zinc-800" />
      </div>

      {/* Row 1: Hero card + Stats 2×3 */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Hero card */}
        <div className="xl:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <div className="h-44 bg-zinc-800" />
          <div className="p-4 space-y-3">
            <div className="h-2.5 w-24 rounded bg-zinc-700" />
            <div className="h-4 w-4/5 rounded bg-zinc-700" />
            <div className="space-y-1">
              <div className="flex justify-between">
                <div className="h-3 w-20 rounded bg-zinc-700" />
                <div className="h-3 w-24 rounded bg-zinc-700" />
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800" />
            </div>
            <div className="h-10 w-full rounded-lg bg-zinc-700" />
          </div>
        </div>

        {/* Stat cards 2×3 */}
        <div className="xl:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-zinc-800" />
                <div className="h-7 w-7 rounded-lg bg-zinc-800" />
              </div>
              <div className="h-6 w-14 rounded bg-zinc-700" />
              <div className="h-2.5 w-28 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Continue watching + Chart + Trails */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Continue watching */}
        <div className="xl:col-span-3 space-y-3">
          <div className="h-4 w-44 rounded bg-zinc-800" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                <div className="h-24 bg-zinc-800" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3 w-4/5 rounded bg-zinc-700" />
                  <div className="h-1 w-full rounded-full bg-zinc-800" />
                  <div className="h-2 w-8 rounded bg-zinc-700" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart + My Trails */}
        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <div className="h-4 w-40 rounded bg-zinc-800" />
            <div className="h-[110px] rounded bg-zinc-800/60" />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <div className="h-4 w-32 rounded bg-zinc-800" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-zinc-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-full rounded bg-zinc-700" />
                  <div className="h-1.5 w-full rounded-full bg-zinc-800" />
                </div>
                <div className="h-3 w-8 rounded bg-zinc-700" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Achievements / Next lessons / Weekly goal / Certificates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <div className="h-4 w-32 rounded bg-zinc-800" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="flex flex-col items-center gap-1">
                  <div className="h-12 w-12 rounded-xl bg-zinc-800" />
                  <div className="h-2 w-10 rounded bg-zinc-700" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
