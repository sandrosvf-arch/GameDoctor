"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Check,
  CreditCard,
  Loader2,
  ShieldCheck,
  TicketPercent,
} from "lucide-react"

type CheckoutPeriod = "annual" | "monthly"

interface CheckoutQuote {
  plan: {
    id: string
    name: string
    slug: string
    description: string | null
    benefits: string[]
    highlighted: boolean
  }
  period: CheckoutPeriod
  periodLabel: string
  accessDurationDays: number
  subtotal: number
  discountTotal: number
  finalTotal: number
  installments: {
    max: number
    noInterest: number
  }
  coupon: {
    applied: boolean
    code: string | null
    discountType: string | null
    discountValue: number | null
    message: string | null
  }
  currentPlan: {
    active: boolean
    expiresAt: string | null
    daysRemaining: number | null
  } | null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function accessLabel(period: CheckoutPeriod) {
  if (period === "annual") return "Acesso por 12 meses"
  return "Acesso por 1 mês"
}

export function CheckoutPageClient({
  initialQuote,
  profile,
}: {
  initialQuote: CheckoutQuote
  profile: {
    name: string
    email: string
    phone: string | null
    cpf: string | null
  }
}) {
  const [quote, setQuote] = useState(initialQuote)
  const [couponCode, setCouponCode] = useState(initialQuote.coupon.code ?? "")
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [startingCheckout, setStartingCheckout] = useState(false)
  const [message, setMessage] = useState<string | null>(initialQuote.coupon.message)
  const [error, setError] = useState<string | null>(null)

  async function refreshQuote(nextCouponCode: string) {
    setLoadingQuote(true)
    setError(null)
    setMessage(null)

    const response = await fetch("/api/checkout/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planSlug: quote.plan.slug,
        period: quote.period,
        couponCode: nextCouponCode,
      }),
    })

    const data = await response.json().catch(() => null)

    setLoadingQuote(false)

    if (!response.ok) {
      setError(data?.error ?? "Não foi possível recalcular o pedido.")
      return
    }

    setQuote(data.quote)
    setCouponCode(data.quote.coupon.code ?? nextCouponCode)
    setMessage(data.quote.coupon.message ?? null)
  }

  async function handleStartCheckout() {
    setStartingCheckout(true)
    setError(null)

    const response = await fetch("/api/checkout/preference", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planSlug: quote.plan.slug,
        period: quote.period,
        couponCode,
      }),
    })

    const data = await response.json().catch(() => null)

    setStartingCheckout(false)

    if (!response.ok) {
      setError(data?.error ?? "Não foi possível iniciar o pagamento.")
      return
    }

    window.location.href = data.initPoint
  }

  const accountIncomplete = !profile.cpf || !profile.phone

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:px-0">
      <section className="min-w-0 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
        <div className="border-b border-white/[0.08] px-5 py-6 md:px-6">
          <div className="mb-3 inline-flex rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400">
            Checkout
          </div>

          <h1 className="max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
            Finalize seu acesso ao curso
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Confira o plano escolhido, aplique um cupom se tiver e avance para concluir sua matrícula.
          </p>
        </div>

        <div className="space-y-5 px-5 py-5 md:px-6 md:py-6">
          {quote.currentPlan?.active && (
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-200">
              Seu acesso já está ativo. Ao finalizar este pedido, o novo período será tratado como renovação.
            </div>
          )}

          {accountIncomplete && (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-200">
              Alguns dados da sua conta ainda estão incompletos. Para evitar problemas na confirmação do pagamento,
              você pode atualizar CPF e telefone em{" "}
              <Link href="/minha-conta" className="font-semibold underline underline-offset-4">
                Minha conta
              </Link>.
            </div>
          )}

          <div className="rounded-lg border border-white/[0.08] bg-[#080b10]">
            <div className="flex flex-col gap-5 border-b border-white/[0.08] px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Plano selecionado
                </p>

                <h2 className="mt-2 text-xl font-semibold text-white md:text-2xl">
                  {quote.plan.name}
                </h2>

                {quote.plan.description && (
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                    {quote.plan.description}
                  </p>
                )}
              </div>

              <div className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.025] px-4 py-3 lg:text-right">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Valor do acesso
                </p>

                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                  {formatCurrency(quote.finalTotal)}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {accessLabel(quote.period)}
                </p>
              </div>
            </div>

            {quote.plan.benefits.length > 0 && (
              <div className="px-5 py-5">
                <p className="mb-3 text-sm font-semibold text-white">
                  O que está incluído
                </p>

                <div className="grid gap-3 md:grid-cols-2">
                  {quote.plan.benefits.map((benefit) => (
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

          <div className="rounded-lg border border-white/[0.08] bg-[#080b10] px-5 py-5">
            <p className="text-sm font-semibold text-white">
              Dados do aluno
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoItem label="Nome" value={profile.name || "-"} />
              <InfoItem label="E-mail" value={profile.email || "-"} />
              <InfoItem label="Telefone" value={profile.phone || "-"} />
              <InfoItem label="CPF" value={profile.cpf || "-"} />
            </div>
          </div>
        </div>
      </section>

      <aside className="min-w-0 lg:sticky lg:top-6 lg:h-fit">
        <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
          <div className="border-b border-white/[0.08] px-5 py-5">
            <h2 className="text-lg font-semibold text-white">
              Resumo do pedido
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Confira os valores antes de continuar.
            </p>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="rounded-md border border-white/[0.08] bg-[#080b10] px-4 py-4">
              <OrderRow label="Plano" value={quote.plan.name} />
              <OrderRow label="Período" value={quote.periodLabel} />
              <OrderRow label="Acesso" value={accessLabel(quote.period)} />
              <OrderRow label="Parcelamento" value={`Até ${quote.installments.max}x`} />
              <OrderRow label="Sem juros" value={`Até ${quote.installments.noInterest}x`} />
            </div>

            <div className="rounded-md border border-white/[0.08] bg-[#080b10] px-4 py-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <TicketPercent className="h-4 w-4 text-slate-500" />
                Cupom de desconto
              </label>

              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  placeholder="Digite seu cupom"
                  className="h-10 min-w-0 rounded-md border border-white/[0.1] bg-[#060a10] px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                />

                <button
                  type="button"
                  onClick={() => void refreshQuote(couponCode)}
                  disabled={loadingQuote}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {loadingQuote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                </button>
              </div>

              {message && (
                <p className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  {message}
                </p>
              )}
            </div>

            <div className="rounded-md border border-white/[0.08] bg-[#080b10] px-4 py-4">
              <PriceRow label="Subtotal" value={formatCurrency(quote.subtotal)} />

              <PriceRow
                label="Desconto"
                value={`- ${formatCurrency(quote.discountTotal)}`}
                valueClassName={quote.discountTotal > 0 ? "text-emerald-300" : "text-slate-300"}
              />

              <div className="mt-4 border-t border-white/[0.08] pt-4">
                <div className="flex items-end justify-between gap-4">
                  <span className="text-sm font-medium text-white">
                    Total final
                  </span>

                  <span className="break-words text-right text-2xl font-semibold tracking-[-0.04em] text-white">
                    {formatCurrency(quote.finalTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-sky-500/20 bg-sky-500/10 px-4 py-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />

                <p className="text-sm leading-6 text-slate-300">
                  Ao continuar, você será redirecionado para o Mercado Pago para concluir o pagamento com segurança.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleStartCheckout()}
              disabled={startingCheckout || loadingQuote}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {startingCheckout && <Loader2 className="h-4 w-4 animate-spin" />}
              {startingCheckout ? "Preparando pagamento..." : "Continuar para pagamento"}
            </button>

            <Link
              href="/planos"
              className="inline-flex h-11 w-full items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              Voltar para os planos
            </Link>

            <div className="flex items-start gap-2 border-t border-white/[0.08] pt-4 text-xs leading-5 text-slate-500">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                O acesso ao curso será liberado após a confirmação do pagamento.
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-sm text-slate-300">
        {value}
      </p>
    </div>
  )
}

function OrderRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span className="shrink-0 text-sm text-slate-500">
        {label}
      </span>

      <span className="min-w-0 break-words text-right text-sm font-medium text-slate-200">
        {value}
      </span>
    </div>
  )
}

function PriceRow({
  label,
  value,
  valueClassName = "text-slate-300",
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className={`text-right text-sm font-medium ${valueClassName}`}>
        {value}
      </span>
    </div>
  )
}