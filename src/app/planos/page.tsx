import Link from "next/link"
import Image from "next/image"
import { ArrowDown, BadgeCheck } from "lucide-react"
import { auth } from "@/lib/auth"
import { listPublicPlans } from "@/lib/checkout"
import { getCachedLessonCount } from "@/lib/lesson-count"
import { repairPriceRows } from "@/lib/repair-prices"
import { OfferCountdown } from "@/components/checkout/OfferCountdown"
import { PlanCheckoutButton } from "@/components/checkout/PlanCheckoutButton"
import { Header } from "@/components/layout/Header"
import { TrackEvent } from "@/components/analytics/TrackEvent"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export const dynamic = "force-dynamic"

export default async function PlanosPage() {
  const session = await auth()
  const isLoggedIn = Boolean(session?.user?.id)
  const [plans, lessonCount] = await Promise.all([
    listPublicPlans(session?.user?.id ?? null),
    getCachedLessonCount().catch(() => 0),
  ])
  const displayPlans = plans
  const highlightedPlan = plans.find((plan) => plan.highlighted) ?? null
  const highlightedOffer = highlightedPlan?.offers[0] ?? null
  const shortestOffer = plans
    .flatMap((plan) => plan.offers)
    .filter((offer) => offer.accessDurationDays > 0)
    .sort((firstOffer, secondOffer) => firstOffer.accessDurationDays - secondOffer.accessDurationDays)[0] ?? null
  const highlightedMonths = highlightedOffer ? Math.max(1, Math.round(highlightedOffer.accessDurationDays / 30)) : 0
  const shortestMonths = shortestOffer ? Math.max(1, Math.round(shortestOffer.accessDurationDays / 30)) : 0
  const shortestDurationLabel = shortestMonths === 12 ? "1 ano" : `${shortestMonths} ${shortestMonths === 1 ? "mês" : "meses"}`
  const annualSavings = highlightedOffer && shortestOffer && highlightedMonths > shortestMonths
    ? Math.max(0, shortestOffer.price * (highlightedMonths / shortestMonths) - highlightedOffer.price)
    : 0
  const annualSavingsPercentage = highlightedOffer && shortestOffer && shortestOffer.price > 0 && annualSavings > 0
    ? Math.round((annualSavings / (shortestOffer.price * (highlightedMonths / shortestMonths))) * 100)
    : 0
  const annualSavingsPerMonth = annualSavings > 0 && highlightedMonths > 0
    ? Math.floor((annualSavings / highlightedMonths) * 100) / 100
    : 0

  return (
    <main className="min-h-screen bg-[#1e2734] text-slate-100">
      <Header />
      <TrackEvent event="view_content" data={{ content_name: "planos", content_ids: plans.map((plan) => plan.slug).join(",") }} />

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_-20%,rgba(34,211,238,0.28),transparent_52%),#1e2734]">
        <div className="mx-auto max-w-5xl px-5 pb-8 pt-8 text-center md:px-8 md:pb-10 md:pt-14">
          <h1 className="mx-auto flex max-w-none flex-col items-center justify-center gap-x-3 gap-y-3 text-2xl font-bold leading-tight text-white sm:flex-row sm:flex-nowrap sm:text-3xl md:text-4xl lg:text-5xl lg:leading-[1.1]">
            <span className="sm:whitespace-nowrap">Escolha seu acesso ao</span>
            <Image
              src="/doctor-oficial.png"
              alt="GameDoctor"
              width={280}
              height={56}
              className="inline-block h-10 w-auto shrink-0 sm:h-9 md:h-11 lg:h-14"
              priority
            />
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-6xl overflow-x-clip px-5 pb-10 pt-4 md:px-8 md:pb-12 md:pt-6">
        {plans.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-white/[0.14] px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-300">Nenhum plano disponível no momento.</p>
            <p className="mt-2 text-sm text-slate-500">Assim que novos acessos forem liberados, eles aparecerão aqui.</p>
          </div>
        ) : (
          <>
            <div className="grid items-stretch gap-6 pt-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {displayPlans.map((plan) => {
              const planMonths = plan.offers[0] ? Math.max(1, Math.round(plan.offers[0].accessDurationDays / 30)) : 0
              const planDurationLabel = planMonths === 12 ? "1 ano" : `${planMonths} ${planMonths === 1 ? "mês" : "meses"}`
              const eyebrow = plan.highlighted
                ? "Para quem quer o melhor custo-benefício"
                : planMonths <= 3
                  ? "Pra quem quer conhecer melhor o mundo da manutenção"
                  : "Para quem quer mais tempo para praticar"
              const fallbackDescription = plan.highlighted
                ? "Pague uma vez e tenha acesso a tudo pelo ano inteiro."
                : planMonths > 0
                  ? `Acesso completo por ${planDurationLabel}.`
                  : ""
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
                    const href = `/checkout/live?plan=${encodeURIComponent(plan.slug)}`
                    const installmentCount = plan.installments.max
                    const installmentValue = Math.floor(Math.round(offer.cardEstimate.total * 100) / installmentCount) / 100
                    const durationMonths = Math.max(1, Math.round(offer.accessDurationDays / 30))

                    return (
                      <div key={offer.period} className="mt-6 flex flex-1 flex-col">
                        {offer.period === "annual" ? (
                          <div>
                            <p className="text-sm font-medium text-white">{installmentCount}x sem juros de</p>
                            <p className="mt-1 flex flex-wrap items-baseline gap-2">
                              <span className="text-4xl font-extrabold text-white md:text-5xl">{formatCurrency(installmentValue)}</span>
                              <span className="text-sm font-semibold text-slate-400">ou {formatCurrency(offer.price)} à vista</span>
                            </p>
                            <p className="mt-2 text-xs text-white">
                              Equivalente a {formatCurrency(offer.price / durationMonths)} /mês
                            </p>
                            {plan.highlighted && annualSavings > 0 && (
                              <p className="mt-2 text-xs font-bold leading-5 text-amber-300">
                                Você economiza {annualSavingsPercentage}% ({formatCurrency(annualSavingsPerMonth)}/mês comparado ao plano de {shortestDurationLabel})
                              </p>
                            )}
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

                        <div className="mt-auto pt-5 [&>a]:w-full [&>button]:h-12 [&>button]:w-full">
                          <PlanCheckoutButton
                            href={href}
                            emphasis={!isLoggedIn || !plan.currentPlan?.active}
                            label={
                              plan.currentPlan?.active
                                ? "Renovar meu acesso"
                                : plan.highlighted
                                  ? "Prefiro esse"
                                  : "Quero esse"
                            }
                          />
                        </div>
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
                </div>
                </article>
              </div>
              )
            })}
            </div>

            <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-6 text-white">
              Todos os planos incluem o mesmo acesso e conteúdo: {lessonCount.toLocaleString("pt-BR")} aulas, comunidade, acesso ao professor, diagramas, materiais baixáveis, lista de fornecedores e softwares. O que muda é só o tempo de acesso.
            </p>
          </>
        )}
      </section>

      <section className="border-y border-white/[0.1] bg-[#232e3e]">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-4 md:px-8 md:pb-20 md:pt-6">
          <div className="flex flex-wrap items-center justify-center gap-3 text-center text-xs font-bold uppercase text-cyan-300 sm:text-sm">
            <span>Veja como é fácil recuperar o investimento e logo em seguida começar a lucrar</span>
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
                  <th className="w-[55%] px-3 py-4 text-center text-sm font-bold sm:px-6 sm:text-base">Serviço</th>
                  <th className="w-[45%] px-3 py-4 text-center text-xs font-bold leading-4 sm:px-6 sm:text-base sm:leading-6">
                    Valor cobrado pelo reparo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.1] bg-white/[0.025]">
                {repairPriceRows.map((row) => (
                  <tr key={row.service}>
                    <td className="px-3 py-4 text-center text-sm text-slate-300 sm:px-6 sm:py-5 sm:text-base">{row.service}</td>
                    <td className="px-3 py-4 text-center text-base font-extrabold text-emerald-400 sm:px-6 sm:py-5 sm:text-xl">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-5 py-5">
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
      </div>

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
