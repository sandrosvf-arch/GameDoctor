export default function CheckoutLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-[#070b12] text-white">
      <div className="h-16 border-b border-white/8 bg-[#0b1120]" />
      <main className="mx-auto max-w-7xl px-6 py-12 md:px-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-6">
            <div className="h-4 w-36 rounded bg-white/10" />
            <div className="mt-4 h-10 w-3/4 rounded bg-white/10" />
            <div className="mt-4 h-4 w-full rounded bg-white/10" />
            <div className="mt-2 h-4 w-2/3 rounded bg-white/10" />
            <div className="mt-8 rounded-[28px] border border-white/8 bg-[#0a1018] p-5">
              <div className="h-4 w-24 rounded bg-white/10" />
              <div className="mt-4 h-8 w-1/2 rounded bg-white/10" />
              <div className="mt-4 h-4 w-3/4 rounded bg-white/10" />
              <div className="mt-6 flex gap-2">
                <div className="h-8 w-28 rounded-full bg-white/10" />
                <div className="h-8 w-24 rounded-full bg-white/10" />
                <div className="h-8 w-20 rounded-full bg-white/10" />
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-6">
            <div className="h-6 w-40 rounded bg-white/10" />
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/8 bg-[#0a1018] p-4">
                <div className="h-4 w-full rounded bg-white/10" />
                <div className="mt-3 h-4 w-4/5 rounded bg-white/10" />
                <div className="mt-3 h-4 w-2/3 rounded bg-white/10" />
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#0a1018] p-4">
                <div className="h-4 w-32 rounded bg-white/10" />
                <div className="mt-4 h-11 w-full rounded-2xl bg-white/10" />
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#0a1018] p-4">
                <div className="h-4 w-full rounded bg-white/10" />
                <div className="mt-3 h-4 w-5/6 rounded bg-white/10" />
                <div className="mt-4 h-6 w-1/2 rounded bg-white/10" />
              </div>
              <div className="h-12 w-full rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
