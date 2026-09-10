import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Home, SearchX } from "lucide-react"

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#080b10] text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(34,211,238,0.13),transparent_38%),radial-gradient(circle_at_20%_90%,rgba(99,102,241,0.10),transparent_30%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:42px_42px]"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="GameDoctor - início">
            <Image src="/doctor-oficial.png" alt="GameDoctor" width={180} height={36} className="h-8 w-auto" priority />
          </Link>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 sm:block">
            Centro de manutenção
          </span>
        </header>

        <section className="flex flex-1 items-center justify-center py-16 sm:py-24">
          <div className="w-full max-w-2xl text-center">
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] border border-cyan-300/30 bg-cyan-300/[0.06] shadow-[0_0_70px_rgba(34,211,238,0.12)] sm:h-32 sm:w-32">
              <div className="absolute inset-3 rounded-[1.35rem] border border-cyan-300/10" />
              <SearchX className="relative h-12 w-12 text-cyan-300 sm:h-14 sm:w-14" strokeWidth={1.5} />
            </div>

            <p className="mt-8 text-sm font-black uppercase tracking-[0.28em] text-cyan-300">Erro 404</p>
            <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-white sm:text-6xl">
              Esse caminho saiu do mapa.
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-slate-400 sm:text-base">
              A página que você tentou acessar não existe ou foi movida. Volte para uma área conhecida e continue seus estudos.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                <Home className="h-4 w-4" />
                Voltar para o início
              </Link>
              <Link
                href="/planos"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Conhecer os planos
              </Link>
            </div>
          </div>
        </section>

        <footer className="text-center text-xs text-slate-600">
          GameDoctor · conhecimento para quem faz manutenção de videogames
        </footer>
      </div>
    </main>
  )
}
