export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 animate-pulse">
      <div className="h-14 border-b border-zinc-800/60 bg-zinc-950/80" />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Order summary */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
            <div className="h-6 w-40 rounded bg-zinc-800" />
            <div className="rounded-xl border border-zinc-800 p-4 space-y-3">
              <div className="h-5 w-3/4 rounded bg-zinc-800" />
              <div className="h-4 w-1/2 rounded bg-zinc-800" />
              <div className="border-t border-zinc-800 pt-3 flex justify-between">
                <div className="h-4 w-16 rounded bg-zinc-800" />
                <div className="h-5 w-20 rounded bg-zinc-700" />
              </div>
            </div>
          </div>
          {/* Payment form */}
          <div className="space-y-5">
            <div className="h-6 w-32 rounded bg-zinc-800" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-24 rounded bg-zinc-800" />
                <div className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900" />
              </div>
            ))}
            <div className="h-12 w-full rounded-xl bg-zinc-700" />
          </div>
        </div>
      </main>
    </div>
  )
}
