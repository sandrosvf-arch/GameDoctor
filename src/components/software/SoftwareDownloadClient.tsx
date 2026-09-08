"use client"

import Link from "next/link"
import { Download, ExternalLink, LockKeyhole, MonitorDown, ShieldCheck } from "lucide-react"

export function SoftwareDownloadClient({
  isLoggedIn,
  canAccess,
  release,
}: {
  isLoggedIn: boolean
  canAccess: boolean
  release: { id: string; title: string; description: string | null; fileName: string; sizeBytes: number; version: string; releaseNotes: string | null } | null
}) {
  const size = release
    ? release.sizeBytes >= 1024 * 1024
      ? `${(release.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(release.sizeBytes / 1024))} KB`
    : null

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-5 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.14] via-card/80 to-card/20 p-7 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Ferramenta oficial</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">GameDoctor para Windows</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            Acesse diagramas, boardviews, documentos e softwares dos materiais da plataforma em um único aplicativo.
          </p>
        </header>

        {!canAccess ? (
          <section className="mt-6 rounded-2xl border border-amber-400/20 bg-card/60 p-7 md:p-10">
            <LockKeyhole className="h-7 w-7 text-amber-300" />
            <h2 className="mt-5 text-2xl font-semibold">Disponível para alunos com plano ativo</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">O aplicativo é usado para acessar os materiais exclusivos das aulas. Entre na sua conta ou conheça os planos para liberar o download.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={isLoggedIn ? "/planos" : "/login?callbackUrl=/software"} className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">{isLoggedIn ? "Conhecer os planos" : "Entrar para continuar"}</Link>
              {!isLoggedIn && <Link href="/planos" className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-semibold">Ver planos</Link>}
            </div>
          </section>
        ) : release ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-2xl border border-border bg-card/55 p-7 md:p-9">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300"><MonitorDown className="h-7 w-7" /></div>
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Versão atual</p><h2 className="mt-1 text-2xl font-semibold">{release.title}</h2><p className="mt-1 text-sm text-muted-foreground">{release.fileName} · {size}</p></div>
              </div>
              {release.description && <p className="mt-7 text-sm leading-7 text-muted-foreground">{release.description}</p>}
              <a href={`/api/downloads/${release.id}`} className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"><Download className="h-4 w-4" /> Baixar aplicativo</a>
              <p className="mt-3 text-center text-xs text-muted-foreground">O download é protegido e requer um plano ativo.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/35 p-7 md:p-9">
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
              <h2 className="mt-4 text-lg font-semibold">O que você encontra no app</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground"><li>Materiais organizados por marca e console.</li><li>Diagramas, documentos, boardviews e softwares das aulas.</li><li>Sincronização para receber materiais novos.</li><li>Arquivos identificados com os dados da sua conta.</li></ul>
              {release.version && <p className="mt-6 border-t border-border pt-5 text-xs text-muted-foreground">Versão {release.version}{release.releaseNotes ? ` · ${release.releaseNotes}` : ""}</p>}
              <Link href="/downloads" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200">Ver todos os materiais <ExternalLink className="h-3.5 w-3.5" /></Link>
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-2xl border border-border bg-card/55 p-8 text-center"><h2 className="text-xl font-semibold">A próxima versão está sendo preparada</h2><p className="mt-2 text-sm text-muted-foreground">Assim que o aplicativo for publicado, o download aparecerá nesta página.</p></section>
        )}
      </div>
    </div>
  )
}
