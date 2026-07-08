"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Clock3, Loader2, RefreshCcw, ShieldAlert, XCircle } from "lucide-react"

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

    const response = await fetch(`/api/checkout/status?orderId=${encodeURIComponent(orderId)}`, {
      cache: "no-store",
    })

    const payload = (await response.json().catch(() => null)) as CheckoutStatusResponse | null

    if (showRefreshState) {
      setRefreshing(false)
    } else {
      setLoading(false)
    }

    if (!response.ok) {
      setData(payload)
      setError(payload?.error ?? "Não foi possível consultar o status do pedido.")
      return
    }

    setData(payload)
    setError(null)
  }

  useEffect(() => {
    void loadStatus()
  }, [orderId])

  useEffect(() => {
    if (!data?.order || !isPendingStatus(data.order.paymentStatus)) {
      return
    }

    const interval = window.setInterval(() => {
      void loadStatus(true)
    }, 5000)

    return () => window.clearInterval(interval)
  }, [data?.order?.paymentStatus, data?.order])

  const statusMeta = useMemo(() => {
    const status = data?.order?.paymentStatus

    if (status === "APPROVED") {
      return {
        tone: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-300" />,
        title: "Pagamento aprovado",
        description: "Seu pedido foi confirmado e o acesso já pode ser liberado automaticamente na plataforma.",
      }
    }

    if (status === "REFUSED" || status === "FAILED") {
      return {
        tone: "border-red-400/20 bg-red-400/10 text-red-100",
        icon: <XCircle className="h-5 w-5 text-red-300" />,
        title: "Pagamento não aprovado",
        description: "A operadora ou o gateway recusou a compra. Você pode tentar novamente com outro meio de pagamento.",
      }
    }

    if (status === "CANCELLED" || status === "EXPIRED") {
      return {
        tone: "border-amber-400/20 bg-amber-400/10 text-amber-100",
        icon: <ShieldAlert className="h-5 w-5 text-amber-300" />,
        title: "Checkout encerrado",
        description: "Esse pedido não foi concluído. Se ainda quiser contratar o plano, reinicie a compra.",
      }
    }

    if (status === "REFUNDED" || status === "CHARGEBACK") {
      return {
        tone: "border-slate-400/20 bg-slate-400/10 text-slate-100",
        icon: <ShieldAlert className="h-5 w-5 text-slate-300" />,
        title: "Pagamento revertido",
        description: "Esse pedido foi reembolsado ou sofreu chargeback. O acesso vinculado pode ter sido suspenso.",
      }
    }

    return {
      tone: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
      icon: <Clock3 className="h-5 w-5 text-cyan-300" />,
      title: "Aguardando confirmação",
      description: "Estamos aguardando o retorno oficial do Mercado Pago. Esta tela atualiza automaticamente por alguns instantes.",
    }
  }, [data?.order?.paymentStatus])

  if (loading) {
    return (
      <div className="rounded-[30px] border border-white/8 bg-white/[0.03] px-6 py-14 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-300" />
        <p className="mt-4 text-sm text-slate-400">Consultando o status do seu pedido...</p>
      </div>
    )
  }

  if (!orderId) {
    return (
      <div className="rounded-[30px] border border-white/8 bg-white/[0.03] px-6 py-14 text-center">
        <p className="text-lg font-semibold text-white">Pedido não encontrado</p>
        <p className="mt-3 text-sm text-slate-400">Abra o checkout novamente a partir da tela de planos.</p>
        <Link
          href="/planos"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Voltar para planos
        </Link>
      </div>
    )
  }

  if (data?.requiresAuth || data?.canView === false) {
    const callbackUrl = `/checkout/status?orderId=${encodeURIComponent(orderId)}`

    return (
      <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-6 md:p-8">
        <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="text-lg font-semibold text-white">Acesso protegido</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Entre com a mesma conta usada na compra para visualizar os detalhes deste pedido com segurança.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="inline-flex h-11 items-center justify-center rounded-full bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Entrar para acompanhar
            </Link>
            <Link
              href="/planos"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]"
            >
              Voltar para planos
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!data?.order) {
    return (
      <div className="rounded-[30px] border border-white/8 bg-white/[0.03] px-6 py-14 text-center">
        <p className="text-lg font-semibold text-white">Não foi possível carregar esse pedido</p>
        <p className="mt-3 text-sm text-slate-400">{error ?? "Tente novamente em instantes."}</p>
        <button
          type="button"
          onClick={() => void loadStatus(true)}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 px-5 text-sm font-medium text-white transition hover:bg-white/[0.05]"
        >
          <RefreshCcw className="h-4 w-4" />
          Atualizar status
        </button>
      </div>
    )
  }

  const retryHref =
    data.order.item?.slug
      ? `/checkout?plan=${encodeURIComponent(data.order.item.slug)}&period=${data.order.item.period}`
      : "/planos"

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-[30px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className={`rounded-3xl border p-5 ${statusMeta.tone}`}>
          <div className="flex items-start gap-3">
            {statusMeta.icon}
            <div>
              <p className="text-lg font-semibold text-white">{statusMeta.title}</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">{statusMeta.description}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-white/8 bg-[#0a1018] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">Pedido</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{data.order.item?.name ?? "Plano"}</h2>
              <p className="mt-2 text-sm text-slate-400">
                {data.order.item?.periodLabel ?? "Plano"} • Pedido #{data.order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadStatus(true)}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/[0.05] disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Atualizar
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-[#070b12] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Status</p>
              <p className="mt-2 text-lg font-semibold text-white">{data.order.paymentStatusLabel}</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#070b12] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Criado em</p>
              <p className="mt-2 text-lg font-semibold text-white">{formatDate(data.order.createdAt) ?? "Agora"}</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#070b12] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Gateway</p>
              <p className="mt-2 text-lg font-semibold text-white">Mercado Pago</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#070b12] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Pagamento</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {data.order.paymentMethod ?? "Definido no checkout"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {data.order.paymentStatus === "APPROVED" ? (
            <>
              <Link
                href="/meus-cursos"
                className="inline-flex h-11 items-center justify-center rounded-full bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Ir para meus cursos
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]"
              >
                Ir para o dashboard
              </Link>
            </>
          ) : null}

          {(data.order.paymentStatus === "REFUSED"
            || data.order.paymentStatus === "FAILED"
            || data.order.paymentStatus === "CANCELLED"
            || data.order.paymentStatus === "EXPIRED") ? (
            <>
              <Link
                href={retryHref}
                className="inline-flex h-11 items-center justify-center rounded-full bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Tentar novamente
              </Link>
              <Link
                href="/planos"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]"
              >
                Voltar para planos
              </Link>
            </>
          ) : null}

          {(data.order.paymentStatus === "PENDING"
            || data.order.paymentStatus === "REFUNDED"
            || data.order.paymentStatus === "CHARGEBACK") ? (
            <Link
              href="/planos"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]"
            >
              Ver outros planos
            </Link>
          ) : null}
        </div>
      </section>

      <aside className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <h2 className="text-lg font-semibold text-white">Resumo financeiro</h2>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/8 bg-[#0a1018] p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-400">Valor bruto</span>
              <span className="text-white">{formatCurrency(data.order.total)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-400">Desconto</span>
              <span className={data.order.discountTotal > 0 ? "text-emerald-300" : "text-white"}>
                - {formatCurrency(data.order.discountTotal)}
              </span>
            </div>
            <div className="mt-4 border-t border-white/8 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-white">Total final</span>
                <span className="text-2xl font-semibold tracking-[-0.04em] text-white">
                  {formatCurrency(data.order.finalTotal)}
                </span>
              </div>
            </div>
          </div>

          {data.order.couponCode ? (
            <div className="rounded-2xl border border-white/8 bg-[#0a1018] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Cupom aplicado</p>
              <p className="mt-2 text-lg font-semibold text-white">{data.order.couponCode}</p>
            </div>
          ) : null}

          {data.order.payment ? (
            <div className="rounded-2xl border border-white/8 bg-[#0a1018] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Detalhes do pagamento</p>
              <div className="mt-3 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Valor</span>
                  <span>{formatCurrency(data.order.payment.amount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Parcelas</span>
                  <span>{data.order.payment.installments ?? 1}x</span>
                </div>
                {data.order.payment.paidAt ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Pago em</span>
                    <span>{formatDate(data.order.payment.paidAt)}</span>
                  </div>
                ) : null}
                {data.order.payment.gatewayPaymentId ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Código no gateway</span>
                    <span className="text-right">{data.order.payment.gatewayPaymentId}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
