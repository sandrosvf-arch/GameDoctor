import Link from "next/link"
import { ArrowDown, Check } from "lucide-react"
import { unstable_cache } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { listPublicPlans } from "@/lib/checkout"
import { OfferCountdown } from "@/components/checkout/OfferCountdown"
import { PlanCheckoutButton } from "@/components/checkout/PlanCheckoutButton"
import { Header } from "@/components/layout/Header"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function buildCheckoutHref(planSlug: string, period: "annual" | "monthly") {
  return `/checkout?plan=${encodeURIComponent(planSlug)}&period=${period}`
}

function buildLoginHref(planSlug: string, period: "annual" | "monthly") {
  return `/login?callbackUrl=${encodeURIComponent(buildCheckoutHref(planSlug, period))}`
}

const getCachedLessonCount = unstable_cache(
  () => db.lesson.count(),
  ["home-lesson-count"],
  { revalidate: 60 }
)

const repairPaybackRows = [
  { service: "Troca / reparo de analógico", repairs: "5 reparos" },
  { service: "Manutenção preventiva de console", repairs: "3 reparos" },
  { service: "Reparo de HDMI", repairs: "2 reparos" },
  { service: "Serviço avançado em placa", repairs: "1 reparo" },
]

export const dynamic = "force-dynamic"

export default async function PlanosPage() {
  const session = await auth()
  const isLoggedIn = Boolean(session?.user?.id)
  const [plans, lessonCount] = await Promise.all([
    listPublicPlans(session?.user?.id ?? null),
    getCachedLessonCount().catch(() => 0),
  ])
  const canSeePrices = isLoggedIn
  const includedContent = [
    `Mais de ${lessonCount.toLocaleString("pt-BR")} aulas disponíveis`,
    "Discussões com a comunidade",
    "Acesso ao professor",
    "Diagramas",
    "Conteúdo exclusivo",
    "Materiais baixáveis",
    "Lista de fornecedores",
    "Softwares",
    "Garantia de aprendizado",
  ]

  return (
    <main className="min-h-screen bg-[#080b10] text-slate-100">
      <Header />

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_-20%,rgba(34,211,238,0.18),transparent_52%),#0b1018]">
        <div className="mx-auto max-w-5xl px-5 pb-12 pt-6 text-center md:px-8 md:pb-20 md:pt-10">
          <Link
            href="/"
            className="flex w-fit items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-300"
          >
            ← Voltar para a home
          </Link>

          <h1 className="mx-auto mt-5 max-w-4xl text-3xl font-bold leading-tight text-white md:text-6xl md:leading-[1.08]">
            Tenha acesso à plataforma mais completa do Brasil em <span className="text-cyan-300">manutenção</span> de videogames.
          </h1>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-16 max-w-6xl overflow-x-clip px-5 pb-10 pt-14 md:-mt-[136px] md:px-8 md:pb-10 md:pt-28">
        {plans.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-white/[0.14] px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-300">Nenhum plano disponível no momento.</p>
            <p className="mt-2 text-sm text-slate-500">Assim que novos acessos forem liberados, eles aparecerão aqui.</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-8">
            {plans.map((plan) => (
              <div key={plan.id} className="plan-card-glow relative w-full max-w-[520px]">
                <article
                  className={[
                    "relative w-full overflow-hidden rounded-[20px] border bg-[#101722] shadow-2xl shadow-black/30 md:rounded-[28px]",
                    plan.highlighted ? "border-cyan-400/50 shadow-cyan-950/30" : "border-white/[0.1]",
                  ].join(" ")}
                >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.10)_0%,transparent_34%,transparent_68%,rgba(16,185,129,0.08)_100%)]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-position:0_-4px] [background-size:32px_32px]"
                />
                {plan.highlighted && (
                  <div className="absolute inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400" />
                )}

                <div className="relative z-10 px-7 pt-6 md:px-10 md:pt-8">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {plan.currentPlan?.active && (
                        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          Acesso ativo
                        </span>
                      )}
                    </div>
                  </div>

                  {plan.description && plan.description.trim().toLocaleLowerCase("pt-BR") !== plan.name.trim().toLocaleLowerCase("pt-BR") && (
                    <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">{plan.description}</p>
                  )}

                  {plan.currentPlan?.active && (
                    <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-sm leading-6 text-emerald-200">
                      {plan.currentPlan.daysRemaining === null
                        ? "Seu acesso está ativo sem data de expiração."
                        : `Seu acesso expira em ${plan.currentPlan.daysRemaining} dia${plan.currentPlan.daysRemaining === 1 ? "" : "s"}.`}
                    </div>
                  )}
                </div>

                <div className="relative z-10 px-7 pb-7 pt-5 md:px-10 md:pb-9 md:pt-6">
                  {plan.offers.map((offer) => {
                    const href = isLoggedIn
                      ? buildCheckoutHref(plan.slug, offer.period)
                      : buildLoginHref(plan.slug, offer.period)
                    const installmentCount = plan.installments.max
                    const installmentValue = offer.cardEstimate.installmentAmount

                    return (
                      <div
                        key={offer.period}
                        className="border-b border-white/[0.08] py-5 first:pt-0 last:border-b-0 last:pb-0"
                      >
                        {canSeePrices ? installmentCount > 1 ? (
                          <div>
                            <p className="text-sm font-medium text-slate-400">Você paga apenas</p>
                            <p className="mt-1 text-4xl font-bold text-white md:text-5xl">
                              {installmentCount}x <span className="text-cyan-300">de {formatCurrency(installmentValue)}</span>
                            </p>
                            <p className="mt-2 text-xs text-white">ou {formatCurrency(offer.price)} à vista</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium text-slate-400">Valor do acesso</p>
                            <p className="mt-1 text-4xl font-bold text-white">{formatCurrency(offer.price)}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-semibold uppercase text-cyan-300">Preço exclusivo</p>
                            <p className="mt-2 text-4xl font-bold text-white md:text-5xl">R$ ****</p>
                          </div>
                        )}

                        <div className="mt-6 [&>a]:w-full [&>button]:h-12 [&>button]:w-full">
                          <PlanCheckoutButton
                            href={href}
                            emphasis={!isLoggedIn || !plan.currentPlan?.active}
                            label={
                              !isLoggedIn
                                ? "ENTRAR PARA VER E COMPRAR"
                                : plan.currentPlan?.active
                                    ? "Renovar meu acesso"
                                    : "Quero começar agora"
                            }
                          />
                          {!isLoggedIn && (
                            <p className="mt-2 text-center text-[11px] leading-4 text-white sm:text-xs sm:leading-5">
                              Faça login para ver o preço e condições sem compromisso.
                            </p>
                          )}

                          <div className="mt-6 border-t border-white/[0.08] pt-6">
                            <p className="mb-2 text-center text-[10px] font-bold uppercase text-slate-200">
                              Oferta especial de lançamento encerra em:
                            </p>
                            <OfferCountdown />
                          </div>
                        </div>

                        {canSeePrices && (
                          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400">
                            <span>Até {plan.installments.max}x no cartão</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-white/[0.08] bg-[#0d1118]">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-8 md:px-8 md:pb-20 md:pt-8">
          <div className="flex flex-wrap items-center justify-center gap-3 text-center text-xs font-bold uppercase text-cyan-300 sm:text-sm">
            <span>Veja em quantos reparos você recupera o investimento</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-400/60 text-rose-400" aria-hidden="true">
              <ArrowDown className="h-4 w-4" />
            </span>
          </div>

          <h2 className="mx-auto mt-7 max-w-3xl text-center text-2xl font-bold text-white md:text-3xl">
            Reparos comuns feitos todos os dias na nossa empresa:
          </h2>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.12]">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="bg-cyan-400 text-slate-950">
                <tr>
                  <th className="w-[56%] px-3 py-4 text-center text-sm font-bold sm:px-6 sm:text-base">Serviço</th>
                  <th className="w-[44%] px-3 py-4 text-center text-xs font-bold leading-4 sm:px-6 sm:text-base sm:leading-6">
                    Quantidade de reparos para recuperar o investimento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.1] bg-white/[0.025]">
                {repairPaybackRows.map((row) => (
                  <tr key={row.service}>
                    <td className="px-3 py-4 text-center text-sm text-slate-300 sm:px-6 sm:py-5 sm:text-base">{row.service}</td>
                    <td className="px-3 py-4 text-center text-sm font-bold text-cyan-300 sm:px-6 sm:py-5 sm:text-base">{row.repairs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.08] bg-[#0b1018]">
        <div className="mx-auto max-w-5xl px-5 py-14 md:px-8 md:py-20">
          <p className="text-sm font-semibold uppercase text-cyan-300">Conteúdo incluso</p>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">Tudo para aprender e aplicar</h2>

          <div className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {includedContent.map((item, index) => (
              <div key={item} className="flex items-start gap-3 border-t border-white/[0.08] pt-5 text-base font-medium text-slate-200">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.35)]">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <span className={index === 0 ? "text-white" : undefined}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  )
}
