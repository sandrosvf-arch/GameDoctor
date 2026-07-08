import Link from "next/link"
import { Check, CreditCard, ShieldCheck } from "lucide-react"
import { auth } from "@/lib/auth"
import { listPublicPlans } from "@/lib/checkout"
import { PlanCheckoutButton } from "@/components/checkout/PlanCheckoutButton"

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
  const callbackUrl = buildCheckoutHref(planSlug, period)
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
}

function accessLabel(period: "annual" | "monthly") {
  if (period === "annual") return "Acesso por 12 meses"
  return "Acesso mensal"
}

export const dynamic = "force-dynamic"

export default async function PlanosPage() {
  const session = await auth()
  const plans = await listPublicPlans(session?.user?.id ?? null)

  return (
    <main className="min-h-screen bg-[#090c11] text-slate-100">
      <section className="border-b border-white/[0.08] bg-[#0c1017]">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400">
              Planos GameDoctor
            </div>

            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl md:leading-[1.08]">
              Escolha o melhor acesso para continuar sua evolução.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-[15px]">
              Compare os planos disponíveis, veja os benefícios incluídos e avance para finalizar sua matrícula no curso.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        {plans.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/[0.12] bg-[#0c1017] px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-300">
              Nenhum plano disponível no momento.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Assim que novos acessos forem liberados, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-5">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={[
                  "flex min-w-0 flex-col overflow-hidden rounded-lg border bg-[#0c1017]",
                  plan.highlighted
                    ? "border-sky-500/25 shadow-[0_0_0_1px_rgba(56,189,248,0.10)]"
                    : "border-white/[0.08]",
                ].join(" ")}
              >
                <div className="border-b border-white/[0.08] px-5 py-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="min-w-0 text-xl font-semibold tracking-[-0.03em] text-white">
                      {plan.name}
                    </h2>

                    {plan.highlighted && (
                      <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300">
                        Recomendado
                      </span>
                    )}

                    {plan.currentPlan?.active && (
                      <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                        Acesso ativo
                      </span>
                    )}
                  </div>

                  {plan.description && (
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {plan.description}
                    </p>
                  )}

                  {plan.currentPlan?.active && (
                    <div className="mt-4 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-200">
                      {plan.currentPlan.daysRemaining === null
                        ? "Seu acesso está ativo sem data de expiração."
                        : `Seu acesso expira em ${plan.currentPlan.daysRemaining} dia${plan.currentPlan.daysRemaining === 1 ? "" : "s"}.`}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col px-5 py-5">
                  <div className="space-y-3">
                    {plan.offers.map((offer) => {
                      const href = session?.user?.id
                        ? buildCheckoutHref(plan.slug, offer.period)
                        : buildLoginHref(plan.slug, offer.period)

                      return (
                        <div
                          key={offer.period}
                          className="rounded-md border border-white/[0.08] bg-[#080b10] p-4"
                        >
                          <div className="flex flex-col gap-4">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                                {offer.label}
                              </p>

                              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                                {formatCurrency(offer.price)}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {accessLabel(offer.period)}
                              </p>
                            </div>

                            <div className="w-full [&>a]:w-full [&>button]:w-full">
                              <PlanCheckoutButton
                                href={href}
                                label={plan.currentPlan?.active ? "Renovar acesso" : "Começar agora"}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-3">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                        <CreditCard className="h-3.5 w-3.5" />
                        Parcelamento
                      </div>

                      <p className="mt-2 text-sm font-semibold text-white">
                        Até {plan.installments.max}x
                      </p>
                    </div>

                    <div className="rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-3">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Sem juros
                      </div>

                      <p className="mt-2 text-sm font-semibold text-white">
                        Até {plan.installments.noInterest}x
                      </p>
                    </div>
                  </div>

                  {plan.benefits.length > 0 && (
                    <div className="mt-5 border-t border-white/[0.08] pt-5">
                      <p className="text-sm font-semibold text-white">
                        Benefícios incluídos
                      </p>

                      <div className="mt-4 space-y-3">
                        {plan.benefits.map((benefit) => (
                          <div key={benefit} className="flex min-w-0 gap-3">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                              <Check className="h-3.5 w-3.5" />
                            </span>

                            <span className="text-sm leading-6 text-slate-300">
                              {benefit}
                            </span>
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

        <div className="mt-8 rounded-lg border border-white/[0.08] bg-[#0c1017] px-5 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Ficou em dúvida sobre qual plano escolher?
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Escolha o acesso que melhor combina com seu momento. Você poderá revisar tudo antes de finalizar o pagamento.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              Voltar
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}