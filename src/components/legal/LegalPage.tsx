import Link from "next/link"
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"

export interface LegalSection {
  title: string
  paragraphs: string[]
  bullets?: string[]
}

interface LegalPageProps {
  eyebrow: string
  title: string
  description: string
  updatedAt: string
  sections: LegalSection[]
}

export function LegalPage({
  eyebrow,
  title,
  description,
  updatedAt,
  sections,
}: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[#080b10] text-slate-100">
      <Header />

      <section className="border-b border-white/[0.08] bg-[radial-gradient(circle_at_50%_-25%,rgba(16,185,209,0.14),transparent_58%),#0b1018]">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a home
          </Link>

          <div className="mt-12 max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              {eyebrow}
            </div>

            <h1 className="text-4xl font-semibold tracking-[-0.06em] text-white md:text-6xl md:leading-[1.04]">
              {title}
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
              {description}
            </p>

            <p className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Última atualização: {updatedAt}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-[220px_minmax(0,1fr)] md:px-8 md:py-16">
        <aside className="h-fit rounded-2xl border border-white/[0.08] bg-[#0d121a] p-4 md:sticky md:top-24">
          <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Documentos
          </p>
          <nav className="space-y-1">
            <Link
              href="/politica-privacidade"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-cyan-300"
            >
              <ShieldCheck className="h-4 w-4" />
              Política de privacidade
            </Link>
            <Link
              href="/termos-de-uso"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-cyan-300"
            >
              <FileText className="h-4 w-4" />
              Termos de uso
            </Link>
          </nav>
        </aside>

        <article className="min-w-0 rounded-3xl border border-white/[0.08] bg-[#0d121a] px-6 py-8 md:px-10 md:py-10">
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title} className="scroll-mt-24">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-white md:text-2xl">
                  {section.title}
                </h2>

                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-400 md:text-[15px]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}

                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="space-y-3 pl-5 marker:text-cyan-400">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="pl-2">{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 border-t border-white/[0.08] pt-6 text-sm leading-6 text-slate-500">
            Dúvidas sobre este documento? Acesse a{" "}
            <Link href="/suporte" className="font-medium text-cyan-300 transition hover:text-cyan-200">
              Central de Ajuda
            </Link>
            {" "}ou abra um ticket de suporte.
          </div>
        </article>
      </section>

      <Footer />
    </main>
  )
}
