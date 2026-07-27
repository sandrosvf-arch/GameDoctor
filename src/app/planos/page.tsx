import Link from "next/link"
import { ArrowRight, Check, CreditCard, ShieldCheck, Sparkles } from "lucide-react"
import { auth } from "@/lib/auth"
import { listPublicPlans } from "@/lib/checkout"
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

function accessLabel(period: "annual" | "monthly") {
  return period === "annual" ? "Acesso por 12 meses" : "Acesso mensal"
}

function getInstallmentCount(installments: { max: number; noInterest: number }) {
  return installments.noInterest > 1 ? installments.noInterest : installments.max
}

export const dynamic = "force-dynamic"

export default async function PlanosPage() {
  const session = await auth()
  const plans = await listPublicPlans(session?.user?.id ?? null)

  return (
    <main className="min-h-screen bg-[#080b10] text-slate-100">
      <Header />

      <section className="relative overflow-hidden border-b border-white/[0.08] bg-[radial-gradient(circle_at_50%_-20%,rgba(16,185,209,0.16),transparent_55%),#0b1018]">
        <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-16">
          <div className="flex justify-start">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-300"
          >
            ← Voltar para a home
          </Link>
          </div>

          <div className="mt-12 text-center md:mt-16">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            Acesso GameDoctor
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-white md:text-6xl md:leading-[1.02]">
            Seu acesso completo ao GameDoctor começa aqui.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
            Um único plano para você estudar, praticar e evoluir na manutenção de videogames.
          </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        {plans.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/[0.14] bg-[#0d121a] px-6 py-20 text-center">
            <p className="text-sm font-medium text-slate-300">Nenhum plano disponível no momento.</p>
            <p className="mt-2 text-sm text-slate-500">Assim que novos acessos forem liberados, eles aparecerão aqui.</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-8">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={[
                  "relative flex w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] border bg-[#101722] shadow-2xl shadow-black/20",
                  plan.highlighted ? "border-cyan-400/50 shadow-cyan-950/30" : "border-white/[0.1]",
                ].join(" ")}
              >
                {plan.highlighted && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400" />
                )}

                <div className="border-b border-white/[0.08] px-7 pb-6 pt-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Plano</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{plan.name}</h2>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {plan.highlighted && (
                        <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                          Mais escolhido
                        </span>
                      )}
                      {plan.currentPlan?.active && (
                        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          Acesso ativo
                        </span>
                      )}
                    </div>
                  </div>

                  {plan.description && (
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

                <div className="flex flex-1 flex-col gap-6 px-7 py-7">
                  {plan.offers.map((offer) => {
                    const href = session?.user?.id
                      ? buildCheckoutHref(plan.slug, offer.period)
                      : buildLoginHref(plan.slug, offer.period)
                    const installmentCount = getInstallmentCount(plan.installments)
                    const installmentValue = offer.price / installmentCount
                    const noInterest = plan.installments.noInterest >= installmentCount

                    return (
                      <div
                        key={offer.period}
                        className="rounded-3xl border border-cyan-400/20 bg-[#080d15] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{offer.label}</p>
                            <p className="mt-1 text-sm text-slate-400">{accessLabel(offer.period)}</p>
                          </div>
                          {noInterest && installmentCount > 1 && (
                            <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                              Sem juros
                            </span>
                          )}
                        </div>

                        {installmentCount > 1 ? (
                          <div className="mt-6">
                            <p className="text-sm font-medium text-slate-400">Você paga apenas</p>
                            <p className="mt-1 text-4xl font-bold tracking-[-0.06em] text-white md:text-5xl">
                              {installmentCount}x <span className="text-cyan-300">de {formatCurrency(installmentValue)}</span>
                            </p>
                            <p className="mt-2 text-xs text-slate-500">ou {formatCurrency(offer.price)} à vista</p>
                          </div>
                        ) : (
                          <div className="mt-6">
                            <p className="text-sm font-medium text-slate-400">Valor do acesso</p>
                            <p className="mt-1 text-4xl font-bold tracking-[-0.06em] text-white">{formatCurrency(offer.price)}</p>
                          </div>
                        )}

                        <div className="mt-6 [&>a]:w-full [&>button]:w-full">
                          <PlanCheckoutButton
                            href={href}
                            label={plan.currentPlan?.active ? "Renovar meu acesso" : "Quero começar agora"}
                          />
                        </div>
                      </div>
                    )
                  })}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-4">
                      <CreditCard className="h-4 w-4 text-cyan-300" />
                      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">Parcelamento</p>
                      <p className="mt-1 text-sm font-semibold text-white">Até {plan.installments.max}x</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-4">
                      <ShieldCheck className="h-4 w-4 text-cyan-300" />
                      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">Sem juros</p>
                      <p className="mt-1 text-sm font-semibold text-white">Até {plan.installments.noInterest}x</p>
                    </div>
                  </div>

                  {plan.benefits.length > 0 && (
                    <div className="border-t border-white/[0.08] pt-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tudo incluído</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {plan.benefits.map((benefit) => (
                          <div key={benefit} className="flex min-w-0 items-start gap-2.5 text-sm text-slate-300">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mx-auto mt-12 flex max-w-2xl flex-col items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0d121a] px-6 py-5 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-sm font-semibold text-white">Ainda está em dúvida?</p>
            <p className="mt-1 text-sm text-slate-500">Confira tudo com calma antes de finalizar.</p>
          </div>
          <Link href="/suporte" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200">
            Fale com a gente <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
