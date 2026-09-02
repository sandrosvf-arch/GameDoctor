import Link from "next/link"
import { redirect } from "next/navigation"
import { Award, CheckCircle2, Lock } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCertificateEligibility } from "@/lib/certificate"

export default async function CertificatesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const eligibility = await getCertificateEligibility(session.user.id, session.user.role)
  const certificate = await db.certificate.findFirst({
    where: { userId: session.user.id, globalKey: session.user.id },
    select: { certificateCode: true },
  })
  const percent = eligibility.totalLessons
    ? Math.min(100, Math.round((eligibility.completedLessons / eligibility.totalLessons) * 100))
    : 0

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
      <header className="rounded-2xl border border-border bg-card/50 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Área do aluno</p>
        <h1 className="mt-2 text-3xl font-semibold">Certificado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Conclua todas as aulas publicadas para liberar seu certificado.</p>
      </header>
      <section className="rounded-2xl border border-border bg-card/50 p-6">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-sm text-muted-foreground">Progresso geral</p><p className="mt-1 text-3xl font-semibold">{percent}%</p></div>
          <Award className="h-10 w-10 text-cyan-400" />
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${percent}%` }} /></div>
        <p className="mt-3 text-sm text-muted-foreground">{eligibility.completedLessons} de {eligibility.totalLessons} aulas concluídas</p>
        {!eligibility.hasPlan && !eligibility.isStaff ? (
          <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200"><Lock className="mb-2 h-4 w-4" />Você precisa de um plano ativo para emitir o certificado.<br /><Link href="/planos" className="mt-2 inline-block font-semibold underline">Ver planos</Link></div>
        ) : !eligibility.eligible ? (
          <div className="mt-6 rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground"><Lock className="mb-2 h-4 w-4" />O download será liberado quando todas as aulas forem concluídas.</div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"><div className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-5 w-5" />Certificado disponível{certificate ? ` · ${certificate.certificateCode}` : ""}</div><a href="/api/certificados/pdf" className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-950">Baixar PDF</a></div>
        )}
      </section>
    </div>
  )
}
