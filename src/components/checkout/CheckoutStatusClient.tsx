"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  Receipt,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react"

type CheckoutStatusResponse = {
  canView: boolean
  requiresAuth?: boolean
  error?: string
  order?: {
    id: string
    paymentStatus: string
    paymentStatusLabel: string
    total: number
    discountTotal: number
    finalTotal: number
    paymentMethod: string | null
    gateway: string
    gatewayReference: string | null
    createdAt: string
    couponCode: string | null
    item: {
      name: string
      slug: string | null
      period: "annual" | "monthly"
      periodLabel: string
      amount: number
    } | null
    payment: {
      id: string
      status: string
      method: string | null
      gatewayPaymentId: string | null
      installments: number | null
      amount: number
      paidAt: string | null
      expiresAt: string | null
      createdAt: string
    } | null
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function isPendingStatus(status: string | undefined) {
  return status === "PENDING"
}

function formatPaymentMethod(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()

  if (!normalized) return "Definido no checkout"
  if (normalized === "PIX") return "Pix"
  if (normalized === "PIX_INSTALLMENTS") return "Parcelamento via Pix - Pagaleve"
  if (normalized === "CREDIT_CARD") return "Cartão de crédito"
  if (normalized === "DEBIT_CARD") return "Cartão de débito"
  if (normalized === "BOLETO") return "Boleto"

  return normalized
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function CheckoutStatusClient({ orderId }: { orderId: string }) {
  const [data, setData] = useState<CheckoutStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadStatus(showRefreshState = false) {
    if (!orderId) {
      setError("Pedido não informado.")
      setLoading(false)
      return
    }

    if (showRefreshState) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch(`/api/checkout/status?orderId=${encodeURIComponent(orderId)}`, {
        cache: "no-store",
      })

      const payload = (await response.json().catch(() => null)) as CheckoutStatusResponse | null

      if (!response.ok) {
        setData(payload)
        setError(payload?.error ?? "Não foi possível consultar o status do pedido.")
        return
      }

      setData(payload)
      setError(null)
    } catch {
      setError("Não foi possível consultar o status do pedido.")
    } finally {
      if (showRefreshState) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [orderId])

  useEffect(() => {
    if (!data?.order || !isPendingStatus(data.order.paymentStatus)) return

    const interval = window.setInterval(() => {
      void loadStatus(true)
    }, 5000)

    return () => window.clearInterval(interval)
  }, [data?.order])

  const statusMeta = useMemo(() => {
    const status = data?.order?.paymentStatus

    if (status === "APPROVED") {
      return {
        tone: "border-emerald-400/20 bg-emerald-400/[0.08]",
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-300" />,
        eyebrow: "Tudo certo",
        title: "Inscrição confirmada",
        description:
          "Seu pagamento foi aprovado. Agora é só acessar a plataforma e continuar seus estudos.",
      }
    }

    if (status === "REFUSED" || status === "FAILED") {
      return {
        tone: "border-red-400/20 bg-red-400/[0.08]",
        icon: <XCircle className="h-5 w-5 text-red-300" />,
        eyebrow: "Não foi dessa vez",
        title: "Não conseguimos concluir o pagamento",
        description:
          "Você pode tentar novamente com outra forma de pagamento para finalizar sua inscrição.",
      }
    }

    if (status === "CANCELLED" || status === "EXPIRED") {
      return {
        tone: "border-amber-400/20 bg-amber-400/[0.08]",
        icon: <ShieldAlert className="h-5 w-5 text-amber-300" />,
        eyebrow: "Sessão encerrada",
        title: "Este pedido foi encerrado",
        description: "Se ainda quiser continuar, é só refazer a inscrição e concluir o pagamento.",
      }
    }

    if (status === "REFUNDED" || status === "CHARGEBACK") {
      return {
        tone: "border-slate-400/20 bg-slate-400/[0.08]",
        icon: <ShieldAlert className="h-5 w-5 text-slate-300" />,
        eyebrow: "Pagamento revertido",
        title: "Houve uma reversão neste pedido",
        description:
          "Esse pagamento foi revertido. Se precisar continuar seus estudos, você pode fazer uma nova inscrição.",
      }
    }

    return {
      tone: "border-cyan-400/20 bg-cyan-400/[0.08]",
      icon: <Clock3 className="h-5 w-5 text-cyan-300" />,
      eyebrow: "Estamos acompanhando",
      title: "Estamos aguardando a confirmação do pagamento",
      description:
        "Assim que o pagamento for confirmado, seu acesso será liberado automaticamente. Esta tela atualiza sozinha por alguns instantes.",
    }
  }, [data?.order?.paymentStatus])

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0b1016] px-6 py-12 text-center shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-300" />
        <p className="mt-4 text-sm text-slate-400">Consultando o status da sua inscrição...</p>
      </div>
    )
  }

  if (!orderId) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0b1016] px-6 py-12 text-center shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <p className="text-base font-semibold text-white">Pedido não encontrado</p>
        <p className="mt-3 text-sm text-slate-400">Abra novamente a página de checkout para continuar.</p>
        <Link
          href="/planos"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
        >
          Voltar para os planos
        </Link>
      </div>
    )
  }

  if (data?.requiresAuth || data?.canView === false) {
    const callbackUrl = `/checkout/status?orderId=${encodeURIComponent(orderId)}`

    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0b1016] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.18)] md:p-7">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.08] p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="text-lg font-semibold text-white">Acesso protegido</p>
              <p className="mt-2 text-sm leading-5 text-slate-300">
                Entre com a mesma conta usada na inscrição para visualizar os detalhes do seu pedido com segurança.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Entrar para acompanhar
            </Link>
            <Link
              href="/planos"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.08] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]"
            >
              Ver planos
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!data?.order) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0b1016] px-6 py-12 text-center shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <p className="text-lg font-semibold text-white">Não foi possível carregar sua inscrição</p>
        <p className="mt-3 text-sm text-slate-400">{error ?? "Tente novamente em instantes."}</p>
        <button
          type="button"
          onClick={() => void loadStatus(true)}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.1] px-5 text-sm font-medium text-white transition hover:bg-white/[0.05]"
        >
          <RefreshCcw className="h-4 w-4" />
          Atualizar página
        </button>
      </div>
    )
  }

  const retryHref =
    data.order.item?.slug
      ? `/checkout?plan=${encodeURIComponent(data.order.item.slug)}&period=${data.order.item.period}`
      : "/planos"

  const itemName = data.order.item?.name ?? "Sua inscrição"
  const periodLabel = data.order.item?.periodLabel ?? "Plano selecionado"
  const paymentMethod = formatPaymentMethod(data.order.payment?.method ?? data.order.paymentMethod)
  const orderShortId = data.order.id.slice(0, 8).toUpperCase()
  const paidTotal = data.order.payment?.amount ?? data.order.finalTotal

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#0b1016] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)] sm:p-5">
        <div className={`rounded-xl border p-4 ${statusMeta.tone}`}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0">{statusMeta.icon}</span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">{statusMeta.eyebrow}</p>
              <h1 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-white sm:text-xl">
                {statusMeta.title}
              </h1>
              <p className="mt-2 text-sm leading-5 text-slate-300">{statusMeta.description}</p>
              {data.order.paymentStatus === "PENDING" && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-100">
                  <Loader2 className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  Atualização automática ativa
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#0a0f15] p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/75">Sua inscrição</p>
              <h2 className="mt-1.5 text-lg font-semibold text-white sm:text-xl">{itemName}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {periodLabel} • Pedido #{orderShortId}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadStatus(true)}
              disabled={refreshing}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 text-xs font-medium text-slate-200 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Atualizar
            </button>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            <InfoCard label="Situação" value={data.order.paymentStatusLabel} icon={<Sparkles className="h-4 w-4" />} />
            <InfoCard label="Forma de pagamento" value={paymentMethod} icon={<CreditCard className="h-4 w-4" />} />
            <InfoCard label="Data da inscrição" value={formatDate(data.order.createdAt) ?? "Agora"} icon={<Receipt className="h-4 w-4" />} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          {data.order.paymentStatus === "APPROVED" ? (
            <>
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
              >
                <BookOpen className="h-4 w-4" />
                Começar agora
              </Link>
              <Link
                href="/comunidade"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.08] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]"
              >
                Acessar comunidade
              </Link>
            </>
          ) : null}

          {(data.order.paymentStatus === "REFUSED" ||
            data.order.paymentStatus === "FAILED" ||
            data.order.paymentStatus === "CANCELLED" ||
            data.order.paymentStatus === "EXPIRED") ? (
            <>
              <Link
                href={retryHref}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
              >
                Tentar novamente
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/planos"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.08] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]"
              >
                Ver outros planos
              </Link>
            </>
          ) : null}

          {(data.order.paymentStatus === "PENDING" ||
            data.order.paymentStatus === "REFUNDED" ||
            data.order.paymentStatus === "CHARGEBACK") ? (
            <>
              <button
                type="button"
                onClick={() => void loadStatus(true)}
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Atualizar agora
              </button>
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.08] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]"
              >
                Ir para o início
              </Link>
            </>
          ) : null}
        </div>
      </section>

      <aside className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#0b1016] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)] sm:p-5 lg:sticky lg:top-5 lg:h-fit">
        <h2 className="text-lg font-semibold text-white">Resumo do pedido</h2>
        <p className="mt-1 text-sm text-slate-400">Resumo simples da sua compra.</p>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-white/[0.07] bg-[#0a0f15] p-3.5">
            <DetailRow label="Curso" value={itemName} />
            <DetailRow label="Período" value={periodLabel} />
            <DetailRow label="Forma de pagamento" value={paymentMethod} />
            <DetailRow label="Pedido" value={`#${orderShortId}`} />
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#0a0f15] p-3.5">
            <PriceRow label="Valor original" value={formatCurrency(data.order.total)} />
            <PriceRow
              label="Desconto"
              value={`- ${formatCurrency(data.order.discountTotal)}`}
              valueClassName={data.order.discountTotal > 0 ? "text-emerald-300" : "text-slate-300"}
            />
            <div className="mt-3 border-t border-white/[0.08] pt-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Total pago</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Valor final da inscrição</p>
                </div>
                <span className="text-right text-xl font-semibold tracking-[-0.03em] text-white">
                  {formatCurrency(paidTotal)}
                </span>
              </div>
            </div>
          </div>

          {data.order.couponCode ? (
            <div className="rounded-xl border border-white/[0.07] bg-[#0a0f15] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cupom utilizado</p>
              <p className="mt-1.5 text-sm font-semibold text-white">{data.order.couponCode}</p>
            </div>
          ) : null}

          {data.order.payment ? (
            <div className="rounded-xl border border-white/[0.07] bg-[#0a0f15] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Detalhes do pagamento</p>
              <div className="mt-3 space-y-2.5">
                <DetailRow label="Valor pago" value={formatCurrency(data.order.payment.amount)} />
                <DetailRow
                  label="Parcelamento"
                  value={data.order.payment.method === "PIX_INSTALLMENTS"
                    ? "Parcelamento via Pix - Pagaleve"
                    : `${data.order.payment.installments ?? 1}x de ${formatCurrency(
                        data.order.payment.amount / (data.order.payment.installments ?? 1)
                      )}`}
                />
                {data.order.payment.paidAt ? <DetailRow label="Confirmação" value={formatDate(data.order.payment.paidAt) ?? "-"} /> : null}
                {data.order.payment.gatewayPaymentId ? (
                  <DetailRow label="Código de referência" value={data.order.payment.gatewayPaymentId} />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0f15] p-3.5">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className="mt-2.5 text-sm font-semibold leading-5 text-white">{value}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="max-w-[62%] break-words text-right text-sm font-medium leading-5 text-slate-200">{value}</span>
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
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-right text-sm font-medium ${valueClassName}`}>{value}</span>
    </div>
  )
}
