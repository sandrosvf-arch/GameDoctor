"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Clock3, Copy, Loader2, Mail, RefreshCcw, ShieldAlert, XCircle } from "lucide-react"

type StatusData = {
  order: {
    id: string
    status: string
    paymentMethod: string | null
    total: number
    installments: number
    createdAt: string
    planName: string
    email: string
    accessEmailSent: boolean
    pix: { qrCodeBase64: string; copyPaste: string; expiresAt: string | null } | null
  }
}

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function methodName(value: string | null) {
  if (value === "PIX") return "Pix"
  if (value === "PIX_INSTALLMENTS") return "Parcelamento via Pix - Pagaleve"
  if (value === "CREDIT_CARD") return "Cartão de crédito"
  return "Pagamento online"
}

export function LiveCheckoutStatusClient({ orderId }: { orderId: string }) {
  const [data, setData] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function load(refresh = false) {
    if (!orderId) {
      setError("Pedido não encontrado ou sessão expirada.")
      setLoading(false)
      return
    }
    refresh ? setRefreshing(true) : setLoading(true)
    try {
      const query = new URLSearchParams({ orderId })
      const response = await fetch(`/api/checkout/live/status?${query.toString()}`, { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Não foi possível consultar o pedido.")
      setData(payload)
      setError(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível consultar o pedido.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void load() }, [orderId])
  useEffect(() => {
    if (data?.order.status !== "PENDING") return
    const interval = window.setInterval(() => void load(true), 5000)
    return () => window.clearInterval(interval)
  }, [data?.order.status, orderId])

  async function resend() {
    setResending(true)
    setMessage(null)
    try {
      const response = await fetch("/api/checkout/live/resend-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Não foi possível reenviar.")
      setMessage("E-mail de acesso reenviado.")
      await load(true)
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Não foi possível reenviar.")
    } finally {
      setResending(false)
    }
  }

  const status = data?.order.status
  const meta = useMemo(() => {
    if (status === "APPROVED") return { icon: <CheckCircle2 className="h-7 w-7 text-emerald-300" />, tone: "border-emerald-400/20 bg-emerald-400/[0.07]", eyebrow: "Pagamento aprovado", title: "Seu acesso está liberado", text: "Enviamos as instruções de acesso para o e-mail informado na compra." }
    if (["REFUSED", "FAILED"].includes(status ?? "")) return { icon: <XCircle className="h-7 w-7 text-red-300" />, tone: "border-red-400/20 bg-red-400/[0.07]", eyebrow: "Pagamento não aprovado", title: "Não foi possível concluir", text: "Você pode voltar ao checkout e tentar outra forma de pagamento." }
    if (["CANCELLED", "EXPIRED"].includes(status ?? "")) return { icon: <ShieldAlert className="h-7 w-7 text-amber-300" />, tone: "border-amber-400/20 bg-amber-400/[0.07]", eyebrow: "Pedido encerrado", title: "Este pagamento expirou", text: "Volte ao checkout para gerar uma nova tentativa." }
    return { icon: <Clock3 className="h-7 w-7 text-cyan-300" />, tone: "border-cyan-400/20 bg-cyan-400/[0.07]", eyebrow: "Confirmação em andamento", title: "Estamos acompanhando seu pagamento", text: "Esta tela atualiza automaticamente. Assim que houver aprovação, seu acesso será enviado por e-mail." }
  }, [status])

  if (loading) return <main className="mx-auto flex min-h-[65vh] max-w-4xl items-center justify-center px-4"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></main>
  if (error || !data) return (
    <main className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-red-400/20 bg-[#0b1017] p-7 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-red-300" /><h1 className="mt-4 text-xl font-semibold">Não foi possível abrir o pedido</h1><p className="mt-2 text-sm text-slate-400">{error}</p><Link href="/checkout/live" className="mt-6 inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950">Voltar ao checkout</Link></div>
    </main>
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <div className={`rounded-2xl border p-6 sm:p-8 ${meta.tone}`}>
        <div className="flex items-start gap-4">{meta.icon}<div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{meta.eyebrow}</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{meta.title}</h1><p className="mt-3 text-sm leading-6 text-slate-300">{meta.text}</p>{status === "PENDING" && <p className="mt-4 flex items-center gap-2 text-xs text-cyan-200"><Loader2 className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Atualização automática ativa</p>}</div></div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-2xl border border-white/[0.08] bg-[#0b1017] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Sua inscrição</p><h2 className="mt-2 text-xl font-semibold">{data.order.planName}</h2><p className="mt-1 text-xs text-slate-500">Pedido #{data.order.id.slice(0, 8).toUpperCase()}</p></div><button type="button" onClick={() => void load(true)} disabled={refreshing} className="flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-slate-300"><RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />Atualizar</button></div>

          {data.order.pix && status === "PENDING" && <div className="mt-6 grid gap-5 rounded-xl border border-white/[0.08] bg-black/20 p-4 sm:grid-cols-[190px_1fr] sm:items-center"><img src={`data:image/png;base64,${data.order.pix.qrCodeBase64}`} alt="QR Code Pix" className="mx-auto w-44 rounded-lg bg-white p-2" /><div><h3 className="font-semibold">Pague pelo aplicativo do seu banco</h3><p className="mt-2 text-sm text-slate-400">Escaneie o QR Code ou copie o código Pix.</p><button type="button" onClick={() => { void navigator.clipboard.writeText(data.order.pix!.copyPaste); setCopied(true) }} className="mt-4 flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-slate-950">{copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Código copiado" : "Copiar código Pix"}</button></div></div>}

          {status === "APPROVED" && <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/20 p-5"><div className="flex gap-3"><Mail className="h-5 w-5 text-cyan-300" /><div><h3 className="font-semibold">Confira seu e-mail</h3><p className="mt-1 text-sm text-slate-400">As instruções foram enviadas para {data.order.email}. Verifique também a caixa de spam.</p></div></div><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => void resend()} disabled={resending} className="flex h-10 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm text-white disabled:opacity-50">{resending && <Loader2 className="h-4 w-4 animate-spin" />}Reenviar acesso</button><Link href="/login" className="flex h-10 items-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-950">Ir para o login</Link></div>{message && <p className="mt-3 text-xs text-cyan-200">{message}</p>}</div>}

          {status !== "APPROVED" && status !== "PENDING" && <Link href="/checkout/live" className="mt-6 inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950">Tentar novamente</Link>}
        </section>

        <aside className="rounded-2xl border border-white/[0.08] bg-[#0b1017] p-5">
          <h2 className="font-semibold">Resumo</h2>
          <dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs text-slate-500">Forma de pagamento</dt><dd className="mt-1 text-slate-200">{methodName(data.order.paymentMethod)}</dd></div><div><dt className="text-xs text-slate-500">Valor</dt><dd className="mt-1 text-xl font-semibold">{currency(data.order.total)}</dd></div>{data.order.installments > 1 && <div><dt className="text-xs text-slate-500">Parcelamento</dt><dd className="mt-1 text-slate-200">{data.order.installments}x</dd></div>}</dl>
        </aside>
      </div>
    </main>
  )
}
