import Link from "next/link"
import { ArrowDown, BadgeCheck, Check, Sparkles } from "lucide-react"
import { auth } from "@/lib/auth"
import { listPublicPlans } from "@/lib/checkout"
import { OfferCountdown } from "@/components/checkout/OfferCountdown"
import { PlanCheckoutButton } from "@/components/checkout/PlanCheckoutButton"
import { Header } from "@/components/layout/Header"
import { GAME_DOCTOR_CHECKOUT_URL } from "@/lib/checkout-links"

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
  const plans = await listPublicPlans(session?.user?.id ?? null)
  const displayPlans = [...plans].sort((firstPlan, secondPlan) => Number(secondPlan.highlighted) - Number(firstPlan.highlighted))
  const annualOffer = plans.flatMap((plan) => plan.offers).find((offer) => offer.period === "annual")
  const monthlyOffer = plans.flatMap((plan) => plan.offers).find((offer) => offer.period === "monthly")
  const annualSavings = annualOffer && monthlyOffer
    ? Math.max(0, monthlyOffer.price * 12 - annualOffer.price)
    : 0
  const annualSavingsPercentage = annualOffer && monthlyOffer && monthlyOffer.price > 0
    ? Math.round((annualSavings / (monthlyOffer.price * 12)) * 100)
    : 0

  return (
    <main className="min-h-screen bg-[#1e2734] text-slate-100">
      <Header />

      <section className="relative overflow-hidden border-b border-white/[0.1] bg-[radial-gradient(circle_at_50%_-20%,rgba(34,211,238,0.28),transparent_52%),#1e2734]">
        <div className="mx-auto max-w-5xl px-5 pb-14 pt-6 text-center md:px-8 md:pb-16 md:pt-10">
          <Link
            href="/"
            className="flex w-fit items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-300"
          >
            ← Voltar para a home
          </Link>

          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300 md:mt-10">
            Formação completa com certificado reconhecido no mercado
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-bold leading-tight text-white md:text-5xl md:leading-[1.1]">
            Escolha seu acesso ao <span className="text-cyan-300">GameDoctor</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
            Juntamos 21 anos de experiência e milhares de consoles que já passaram pela nossa bancada para entregar tudo mastigado para você começar ou expandir sua assistência.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl overflow-x-clip px-5 pb-14 pt-8 md:px-8 md:pb-20 md:pt-10">
        {plans.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-white/[0.14] px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-300">Nenhum plano disponível no momento.</p>
            <p className="mt-2 text-sm text-slate-500">Assim que novos acessos forem liberados, eles aparecerão aqui.</p>
          </div>
        ) : (
          <>
            <div className="grid items-start gap-6 pt-4 lg:grid-cols-2 lg:gap-8">
            {displayPlans.map((plan) => {
              const eyebrow = plan.highlighted
                ? "Para quem quer o melhor custo-benefício"
                : "Para quem quer testar sem compromisso"
              const fallbackDescription = plan.highlighted
                ? "Pague uma vez e tenha acesso a tudo pelo ano inteiro."
                : "Cancele quando quiser, sem taxas escondidas."
              const description = plan.description && plan.description.trim().toLocaleLowerCase("pt-BR") !== plan.name.trim().toLocaleLowerCase("pt-BR")
                ? plan.description
                : fallbackDescription

              return (
              <div key={plan.id} className="group relative w-full transition-transform duration-300 ease-out hover:-translate-y-1.5">
                {plan.highlighted && (
                  <span className="absolute -top-3.5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-300 px-4 py-1.5 text-[11px] font-black uppercase tracking-wide text-zinc-950 shadow-lg shadow-amber-900/30">
                    <BadgeCheck className="mr-1.5 inline h-3.5 w-3.5" />
                    Melhor escolha
                  </span>
                )}
                <article
                  className={[
                    "relative flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-[#2c3749] shadow-2xl shadow-black/30 transition-[box-shadow,border-color] duration-300",
                    plan.highlighted
                      ? "border-amber-300/60 bg-gradient-to-b from-[#38466099] to-[#2c3749] shadow-amber-950/20 group-hover:border-amber-300/90 group-hover:shadow-[0_24px_50px_rgba(245,158,11,0.18)]"
                      : "border-white/[0.14] group-hover:border-cyan-300/50 group-hover:shadow-[0_24px_50px_rgba(0,0,0,0.5)]",
                  ].join(" ")}
                >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-position:0_-4px] [background-size:32px_32px]"
                />
                {plan.highlighted && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300" />}

                <div className="relative z-10 flex flex-1 flex-col px-7 pb-7 pt-8 md:px-10 md:pb-9 md:pt-10">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</p>
                    {plan.currentPlan?.active && (
                      <span className="shrink-0 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        Acesso ativo
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">{plan.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>

                  {plan.offers.map((offer) => {
                    const href = offer.period === "annual"
                      ? GAME_DOCTOR_CHECKOUT_URL
                      : isLoggedIn
                        ? buildCheckoutHref(plan.slug, offer.period)
                        : buildLoginHref(plan.slug, offer.period)
                    const installmentCount = plan.installments.max
                    const installmentValue = offer.cardEstimate.installmentAmount
                    const showInstallments = offer.period === "annual" && installmentCount > 1

                    return (
                      <div key={offer.period} className="mt-6">
                        {offer.period === "annual" ? (
                          <div>
                            <p className="text-sm font-medium text-slate-400">A partir de</p>
                            <p className="mt-1 flex flex-wrap items-baseline gap-2">
                              <span className="text-4xl font-extrabold text-white md:text-5xl">{formatCurrency(offer.price / 12)}</span>
                              <span className="text-sm font-semibold text-slate-400">/mês equivalente</span>
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                              {showInstallments
                                ? `Cobrado em ${installmentCount}x de ${formatCurrency(installmentValue)} ou ${formatCurrency(offer.price)} à vista.`
                                : `Cobrado ${formatCurrency(offer.price)} por ano.`}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium text-slate-400">Acesso mensal</p>
                            <p className="mt-1 flex items-baseline gap-2">
                              <span className="text-4xl font-extrabold text-white md:text-5xl">{formatCurrency(offer.price)}</span>
                              <span className="text-sm font-semibold text-slate-400">/mês</span>
                            </p>
                            <p className="mt-2 text-xs text-slate-400">Cobrança recorrente no cartão, cancele quando quiser.</p>
                          </div>
                        )}

                        <div className="mt-5 [&>a]:w-full [&>button]:h-12 [&>button]:w-full">
                          <PlanCheckoutButton
                            href={href}
                            emphasis={!isLoggedIn || !plan.currentPlan?.active}
                            label={
                              plan.currentPlan?.active
                                ? "Renovar meu acesso"
                                : plan.highlighted
                                  ? "Quero esse"
                                  : "Prefiro esse"
                            }
                          />
                          {!isLoggedIn && (
                            <p className="mt-2 text-center text-[11px] leading-4 text-slate-400 sm:text-xs sm:leading-5">
                              Cadastro rápido, grátis e sem compromisso.
                            </p>
                          )}
                        </div>

                        {offer.period === "annual" && annualSavingsPercentage > 0 && (
                          <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/[0.08] px-4 py-3 text-xs leading-5 text-amber-100">
                            <p className="flex items-center gap-2 font-bold">
                              <Sparkles className="h-4 w-4 shrink-0" />
                              Você economiza {formatCurrency(annualSavings)} ({annualSavingsPercentage}%) comparado ao mensal
                            </p>
                          </div>
                        )}

                        <p className="mt-4 text-center text-xs text-slate-400">
                          {offer.period === "monthly" ? "Cobrança mensal no cartão" : `Até ${plan.installments.max}x no cartão`}
                        </p>
                      </div>
                    )
                  })}

                  {plan.currentPlan?.active && (
                    <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-sm leading-6 text-emerald-200">
                      {plan.currentPlan.daysRemaining === null
                        ? "Seu acesso está ativo sem data de expiração."
                        : `Seu acesso expira em ${plan.currentPlan.daysRemaining} dia${plan.currentPlan.daysRemaining === 1 ? "" : "s"}.`}
                    </div>
                  )}

                  <div className="mt-7 border-t border-white/[0.08] pt-6">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">O que está incluso</p>
                    <ul className="mt-4 space-y-2.5">
                      {plan.benefits.slice(0, 6).map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2.5 text-sm text-slate-300">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" strokeWidth={3} />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                </article>
              </div>
              )
            })}
            </div>

            <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-5 py-5">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:text-left">
                <div className="text-center sm:text-left">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Condição especial disponível</p>
                  <p className="mt-1 text-sm text-slate-400">Garanta o valor atual antes do encerramento da oferta.</p>
                </div>
                <div className="w-full max-w-[300px] shrink-0">
                  <OfferCountdown />
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="border-y border-white/[0.1] bg-[#232e3e]">
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

      <section className="border-y border-white/[0.1] bg-[#1e2734]">
        <div className="mx-auto max-w-5xl px-5 py-14 md:px-8 md:py-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Quem construiu a formação</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold text-white md:text-4xl">
              Conhecimento de quem <span className="text-cyan-300">vive esse mercado todos os dias.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400 md:text-base">
              MeuGameUsado + Maxtech: experiência real de mercado transformada em uma formação prática.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
            <article className="flex items-center gap-5 rounded-2xl border border-white/[0.14] bg-white/[0.06] p-6">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[#141b24] p-3">
                <img
                  src="https://cursolp.swarp.tech/wp-content/uploads/2025/04/MGU-icone-sem-fundo-1-e1784581173764.png"
                  alt="MeuGameUsado"
                  className="max-h-16 w-full object-contain"
                />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-cyan-300">MeuGameUsado</p>
                <h3 className="mt-1 text-lg font-bold leading-snug text-white">Maior e-commerce de compra e venda de games usados do Brasil</h3>
                <p className="mt-1 text-sm text-slate-400">Compra, venda, testes e movimentação diária de produtos do mercado gamer.</p>
              </div>
            </article>

            <div className="hidden items-center justify-center text-3xl font-black text-cyan-300 md:flex">+</div>

            <article className="flex items-center gap-5 rounded-2xl border border-white/[0.14] bg-white/[0.06] p-6">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[#141b24] p-3">
                <img
                  src="https://cursolp.swarp.tech/wp-content/uploads/2026/07/d7.jpg"
                  alt="Maxtech"
                  className="max-h-16 w-full object-contain"
                />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-cyan-300">Maxtech</p>
                <h3 className="mt-1 text-lg font-bold leading-snug text-white">Maior assistência técnica especializada em videogames do Brasil</h3>
                <p className="mt-1 text-sm text-slate-400">Mais de 21 anos de diagnóstico, reparo e manutenção de consoles e controles.</p>
              </div>
            </article>
          </div>

          <div className="mt-4 grid overflow-hidden rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.05] sm:grid-cols-3">
            <div className="border-b border-white/[0.08] px-5 py-5 text-center sm:border-b-0 sm:border-r">
              <p className="text-base font-black text-cyan-300">+21 ANOS</p>
              <p className="mt-1 text-xs text-slate-400">de experiência prática</p>
            </div>
            <div className="border-b border-white/[0.08] px-5 py-5 text-center sm:border-b-0 sm:border-r">
              <p className="text-base font-black text-cyan-300">MILHARES / MÊS</p>
              <p className="mt-1 text-xs text-slate-400">de consoles, controles e equipamentos movimentados</p>
            </div>
            <div className="px-5 py-5 text-center">
              <p className="text-base font-black text-cyan-300">PRÁTICA REAL</p>
              <p className="mt-1 text-xs text-slate-400">defeitos, diagnósticos, erros e acertos de operação</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/quem-somos"
              className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              Conheça nossa história completa →
            </Link>
          </div>
        </div>
      </section>

    </main>
  )
}
