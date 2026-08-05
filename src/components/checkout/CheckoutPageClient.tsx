"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react"
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  Copy,
  Loader2,
  LockKeyhole,
  Pencil,
  QrCode,
  ShieldCheck,
  TicketPercent,
} from "lucide-react"

const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim() ?? ""

type CheckoutPeriod = "annual" | "monthly"
type PaymentMethod = "pix" | "card"

interface PixPaymentState {
  orderId: string
  qrCodeBase64: string
  copyPaste: string
  expiresAt: string | null
  status: string
}

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
  installments: { max: number; noInterest: number }
  coupon: {
    applied: boolean
    code: string | null
    discountType: string | null
    discountValue: number | null
    message: string | null
  }
  currentPlan: { active: boolean; expiresAt: string | null; daysRemaining: number | null } | null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return String(Date.now()) + "-" + Math.random().toString(36).slice(2)
}

export function CheckoutPageClient({
  initialQuote,
  profile,
}: {
  initialQuote: CheckoutQuote
  profile: { name: string; email: string; phone: string | null; cpf: string | null }
}) {
  const [quote, setQuote] = useState(initialQuote)
  const [couponCode, setCouponCode] = useState(initialQuote.coupon.code ?? "")
  const [cpf, setCpf] = useState(profile.cpf ?? "")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [autoRenew, setAutoRenew] = useState(initialQuote.period === "annual")
  const [message, setMessage] = useState<string | null>(initialQuote.coupon.message)
  const [error, setError] = useState<string | null>(null)
  const [cardSdkReady, setCardSdkReady] = useState(false)
  const [pixPayment, setPixPayment] = useState<PixPaymentState | null>(null)
  const [pixCopied, setPixCopied] = useState(false)
  const idempotencyKeyRef = useRef(newIdempotencyKey())
  const submittingPaymentRef = useRef(false)

  useEffect(() => {
    if (!publicKey) return

    initMercadoPago(publicKey)
    setCardSdkReady(true)
  }, [])

  async function refreshQuote(nextCouponCode: string) {
    setLoadingQuote(true)
    setError(null)
    setMessage(null)
    setPixPayment(null)
    setPixCopied(false)

    try {
      const response = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planSlug: quote.plan.slug,
          period: quote.period,
          couponCode: nextCouponCode.trim(),
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.error ?? "Não foi possível recalcular o pedido.")
        return
      }

      setQuote(data.quote)
      setCouponCode(data.quote.coupon.code ?? nextCouponCode.trim())
      setMessage(data.quote.coupon.message ?? null)
      idempotencyKeyRef.current = newIdempotencyKey()
    } catch {
      setError("Não foi possível recalcular o pedido. Tente novamente.")
    } finally {
      setLoadingQuote(false)
    }
  }

  const maxInstallments = Math.min(12, Math.max(1, quote.installments.max))
  const noInterestInstallments = Math.min(maxInstallments, Math.max(1, quote.installments.noInterest))

  function choosePaymentMethod(method: PaymentMethod) {
    setSelectedPaymentMethod(method)
    setError(null)
    setPixPayment(null)
    setPixCopied(false)
    idempotencyKeyRef.current = newIdempotencyKey()
  }

  function changePaymentMethod() {
    setSelectedPaymentMethod(null)
    setError(null)
    submittingPaymentRef.current = false
    setSubmittingPayment(false)
    setPixPayment(null)
    setPixCopied(false)
    idempotencyKeyRef.current = newIdempotencyKey()
  }

  const handleSubmitCard = useCallback(
    async (formData: {
      token: string
      issuer_id: string
      payment_method_id: string
      installments: number
    }) => {
      if (submittingPaymentRef.current) return

      submittingPaymentRef.current = true
      setSubmittingPayment(true)
      setError(null)

      try {
        const response = await fetch("/api/checkout/card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planSlug: quote.plan.slug,
            period: quote.period,
            couponCode,
            cardToken: formData.token,
            paymentMethodId: formData.payment_method_id,
            issuerId: formData.issuer_id,
            installments: formData.installments,
            autoRenew: quote.period === "annual" && autoRenew,
            idempotencyKey: idempotencyKeyRef.current,
          }),
        })
        const data = await response.json().catch(() => null)

        if (!response.ok) {
          setError(data?.error ?? "Não foi possível processar o pagamento.")
          return
        }

        window.location.href = "/checkout/status?orderId=" + encodeURIComponent(data.orderId)
      } catch {
        setError("Não foi possível processar o pagamento. Tente novamente.")
      } finally {
        submittingPaymentRef.current = false
        setSubmittingPayment(false)
      }
    },
    [autoRenew, couponCode, quote.period, quote.plan.slug],
  )

  const handleSubmitPix = useCallback(async () => {
    if (submittingPaymentRef.current) return

    const cpfDigits = cpf.replace(/\D/g, "")
    if (cpfDigits.length !== 11) {
      setError("Informe um CPF válido para gerar o Pix.")
      return
    }

    submittingPaymentRef.current = true
    setSubmittingPayment(true)
    setError(null)
    setPixCopied(false)

    try {
      const response = await fetch("/api/checkout/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planSlug: quote.plan.slug,
          period: quote.period,
          couponCode,
          cpf: cpfDigits,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.error ?? "Não foi possível gerar o Pix.")
        return
      }

      setPixPayment({
        orderId: data.orderId,
        qrCodeBase64: data.pix.qrCodeBase64,
        copyPaste: data.pix.copyPaste,
        expiresAt: data.pix.expiresAt ?? null,
        status: data.status ?? "PENDING",
      })
    } catch {
      setError("Não foi possível gerar o Pix. Tente novamente.")
    } finally {
      submittingPaymentRef.current = false
      setSubmittingPayment(false)
    }
  }, [cpf, couponCode, quote.period, quote.plan.slug])

  useEffect(() => {
    const pixOrderId = pixPayment?.orderId
    if (!pixOrderId || pixPayment?.status !== "PENDING") return

    let cancelled = false

    async function refreshPixStatus() {
      try {
        const response = await fetch(
          "/api/checkout/status?orderId=" + encodeURIComponent(String(pixOrderId)),
          { cache: "no-store" }
        )
        const data = await response.json().catch(() => null)
        const nextStatus = data?.order?.paymentStatus

        if (!cancelled && nextStatus && nextStatus !== "PENDING") {
          setPixPayment((current) => current ? { ...current, status: nextStatus } : current)
        }
      } catch {
        // O próximo ciclo de consulta tenta novamente.
      }
    }

    void refreshPixStatus()
    const interval = window.setInterval(() => void refreshPixStatus(), 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [pixPayment?.orderId, pixPayment?.status])
  const cardInitialization = useMemo(
    () => ({ amount: quote.finalTotal, payer: { email: profile.email } }),
    [profile.email, quote.finalTotal],
  )

  const cardCustomization = useMemo(
    () => ({
      paymentMethods: { minInstallments: 1, maxInstallments },
      visual: { hideFormTitle: true },
    }),
    [maxInstallments],
  )

  const handleCardError = useCallback(() => {
    setError("Não foi possível carregar os dados do cartão. Tente novamente.")
  }, [])

  const accessLabel = quote.period === "annual" ? "12 meses de acesso" : "1 mês de acesso"
  const hasProfileCpf = profile.cpf?.replace(/\D/g, "").length === 11
  const paymentMethodLabel =
    selectedPaymentMethod === "pix"
      ? "PIX"
      : selectedPaymentMethod === "card"
        ? "Cartão de crédito"
        : "Não selecionada"

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Checkout seguro</p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl">
            Finalize sua inscrição
          </h1>
        </div>

        <Link
          href="/planos"
          className="hidden items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white sm:inline-flex"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 space-y-4">
          {quote.currentPlan?.active && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-100">
              Seu acesso já está ativo. Esta compra será tratada como renovação.
            </div>
          )}

          {selectedPaymentMethod === "pix" && !cpf && (
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100">
              Informe seu CPF no formulário para gerar o pagamento via Pix.
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1118] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-slate-500">Plano escolhido</p>
                <h2 className="mt-1.5 text-lg font-semibold text-white">{quote.plan.name}</h2>
                <p className="mt-1 text-sm text-slate-400">{accessLabel}</p>
              </div>

              <div className="sm:text-right">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Total</p>
                <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">
                  {formatCurrency(quote.finalTotal)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">até {noInterestInstallments}x sem juros</p>
              </div>
            </div>

            {quote.plan.benefits.length > 0 && (
              <div className="border-t border-white/[0.07] px-5 py-4">
                <div className="grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
                  {quote.plan.benefits.map((benefit) => (
                    <div key={benefit} className="flex min-w-0 items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                      <span className="text-sm leading-5 text-slate-300">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1118] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            <div className="border-b border-white/[0.07] px-5 py-4">
              <h2 className="text-base font-semibold text-white">Forma de pagamento</h2>
              <p className="mt-1 text-sm text-slate-500">Escolha uma opção para abrir os dados de pagamento.</p>
            </div>

            {selectedPaymentMethod === null ? (
              <div className="space-y-2.5 p-3 sm:p-4">
                <PaymentMethodOption
                  title="Pix"
                  description="Aprovação rápida e pagamento à vista"
                  icon={<QrCode className="h-5 w-5" />}
                  badge="Instantâneo"
                  onClick={() => choosePaymentMethod("pix")}
                />
                <PaymentMethodOption
                  title="Cartão de crédito"
                  description={"Parcele em até " + noInterestInstallments + "x sem juros"}
                  icon={<CreditCard className="h-5 w-5" />}
                  badge="Visa, Mastercard e Elo"
                  onClick={() => choosePaymentMethod("card")}
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-200">
                      {selectedPaymentMethod === "pix" ? <QrCode className="h-[18px] w-[18px]" /> : <CreditCard className="h-[18px] w-[18px]" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{paymentMethodLabel}</p>
                      <p className="text-xs text-slate-500">Forma de pagamento selecionada</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={changePaymentMethod}
                    disabled={submittingPayment}
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.025] px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Alterar
                  </button>
                </div>

                {selectedPaymentMethod === "pix" ? (
                  <div className="p-5">
                    {!pixPayment ? (
                      <>
                        {!hasProfileCpf && (
                          <label className="block">
                            <span className="text-sm font-medium text-white">CPF do pagador</span>
                            <input
                              value={cpf}
                              onChange={(event) => setCpf(event.target.value.replace(/\D/g, "").slice(0, 11))}
                              inputMode="numeric"
                              autoComplete="off"
                              placeholder="00000000000"
                              maxLength={11}
                              className="mt-2 h-11 w-full rounded-lg border border-white/[0.09] bg-[#090d13] px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60"
                            />
                            <span className="mt-1.5 block text-xs text-slate-500">Usaremos este documento apenas para identificar o pagamento.</span>
                          </label>
                        )}
                        <div className="rounded-xl border border-white/[0.08] bg-[#090d13] p-4">
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><QrCode className="h-5 w-5" /></span>
                            <div>
                              <p className="text-sm font-semibold text-white">Pague com Pix</p>
                              <p className="mt-1 text-sm leading-5 text-slate-400">Gere o QR Code e pague pelo aplicativo do seu banco.</p>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                            <PaymentBenefit text="Aprovação em poucos segundos" />
                            <PaymentBenefit text="Pagamento único à vista" />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleSubmitPix()}
                          disabled={submittingPayment || cpf.replace(/\D/g, "").length !== 11}
                          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {submittingPayment ? <><Loader2 className="h-4 w-4 animate-spin" />Gerando Pix...</> : <><QrCode className="h-4 w-4" />Gerar Pix de {formatCurrency(quote.finalTotal)}</>}
                        </button>
                      </>
                    ) : pixPayment.status === "APPROVED" ? (
                      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] p-5 text-center">
                        <Check className="mx-auto h-8 w-8 text-emerald-300" />
                        <p className="mt-3 text-base font-semibold text-white">Pagamento aprovado</p>
                        <p className="mt-1 text-sm text-emerald-100">Seu acesso foi liberado. Você já pode continuar seus estudos.</p>
                        <Link href="/dashboard" className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-950">Ir para o dashboard</Link>
                      </div>
                    ) : pixPayment.status !== "PENDING" ? (
                      <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-5 text-center">
                        <p className="text-base font-semibold text-white">Não foi possível confirmar este Pix</p>
                        <p className="mt-1 text-sm text-red-100">O pagamento não está mais aguardando confirmação. Gere um novo código para tentar novamente.</p>
                        <button
                          type="button"
                          onClick={() => { setPixPayment(null); setPixCopied(false); idempotencyKeyRef.current = newIdempotencyKey() }}
                          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-950"
                        >
                          Gerar novo Pix
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4">
                          <p className="text-sm font-semibold text-white">Pix gerado</p>
                          <p className="mt-1 text-sm leading-5 text-slate-400">Escaneie o QR Code ou copie o código abaixo. Esta tela será atualizada após a confirmação.</p>
                        </div>
                        <div className="flex justify-center rounded-xl bg-white p-4">
                          <img src={"data:image/png;base64," + pixPayment.qrCodeBase64} alt="QR Code para pagamento" className="h-52 w-52 max-w-full" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-white">Pix copia e cola</label>
                          <div className="mt-2 flex gap-2">
                            <input readOnly value={pixPayment.copyPaste} className="min-w-0 flex-1 rounded-lg border border-white/[0.09] bg-[#090d13] px-3 text-xs text-slate-300 outline-none" />
                            <button
                              type="button"
                              onClick={() => { void navigator.clipboard?.writeText(pixPayment.copyPaste); setPixCopied(true) }}
                              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-white/[0.09] px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                            >
                              {pixCopied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                              {pixCopied ? "Copiado" : "Copiar"}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                          <span>Aguardando confirmação do pagamento...</span>
                          {pixPayment.expiresAt && (
                            <span>
                              Válido até {new Intl.DateTimeFormat("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              }).format(new Date(pixPayment.expiresAt))}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 sm:p-5">
                    {!publicKey ? (
                      <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100">O pagamento com cartão está temporariamente indisponível.</div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white p-2 sm:p-3">
                        {!cardSdkReady ? (
                          <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando pagamento...</div>
                        ) : (
                          <CardPayment
                            initialization={cardInitialization}
                            customization={cardCustomization}
                            locale="pt-BR"
                            onSubmit={handleSubmitCard}
                            onError={handleCardError}
                          />
                        )}
                      </div>
                    )}
                    {quote.period === "annual" && (
                      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                        <input type="checkbox" checked={autoRenew} onChange={(event) => setAutoRenew(event.target.checked)} className="mt-0.5 h-4 w-4 accent-cyan-400" />
                        <span>
                          <span className="block text-sm font-medium text-white">Renovação anual automática</span>
                          <span className="mt-0.5 block text-xs leading-5 text-slate-500">Você poderá cancelar a renovação quando quiser.</span>
                        </span>
                      </label>
                    )}
                    {submittingPayment && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-cyan-200"><Loader2 className="h-4 w-4 animate-spin" />Processando pagamento...</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <Link
            href="/planos"
            className="inline-flex items-center gap-2 py-2 text-sm font-medium text-slate-500 transition hover:text-white sm:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para os planos
          </Link>
        </section>

        <aside className="min-w-0 lg:sticky lg:top-5">
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1118] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            <div className="border-b border-white/[0.07] px-5 py-4">
              <h2 className="text-base font-semibold text-white">Resumo do pedido</h2>
            </div>

            <div className="space-y-4 p-5">
              <div className="space-y-3">
                <OrderRow label="Plano" value={quote.plan.name} />
                <OrderRow label="Período" value={quote.periodLabel} />
                <OrderRow label="Pagamento" value={paymentMethodLabel} />
              </div>

              <div className="border-t border-white/[0.07] pt-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <TicketPercent className="h-4 w-4 text-slate-500" />
                  Cupom de desconto
                </label>

                <div className="mt-2.5 flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !loadingQuote) void refreshQuote(couponCode)
                    }}
                    placeholder="Seu cupom"
                    className="h-10 min-w-0 flex-1 rounded-lg border border-white/[0.09] bg-[#090d13] px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => void refreshQuote(couponCode)}
                    disabled={loadingQuote || !couponCode.trim()}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.035] px-3.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingQuote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                  </button>
                </div>

                {message && <p className="mt-2 text-xs leading-5 text-emerald-300">{message}</p>}
              </div>

              <div className="border-t border-white/[0.07] pt-4">
                <PriceRow label="Subtotal" value={formatCurrency(quote.subtotal)} />
                {quote.discountTotal > 0 && (
                  <PriceRow
                    label="Desconto"
                    value={`- ${formatCurrency(quote.discountTotal)}`}
                    valueClassName="text-emerald-300"
                  />
                )}

                <div className="mt-3 flex items-end justify-between gap-4 border-t border-white/[0.07] pt-4">
                  <div>
                    <p className="text-sm font-medium text-white">Total</p>
                    <p className="mt-0.5 text-xs text-slate-500">{accessLabel}</p>
                  </div>
                  <span className="text-right text-2xl font-semibold tracking-[-0.04em] text-white">
                    {formatCurrency(quote.finalTotal)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
                <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-cyan-200" />
                <p className="text-xs leading-5 text-slate-400">
                  Pagamento protegido. O acesso é liberado após a confirmação.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-600">
                <LockKeyhole className="h-3.5 w-3.5" />
                Ambiente seguro e criptografado
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

function PaymentMethodOption({
  title,
  description,
  icon,
  badge,
  onClick,
}: {
  title: string
  description: string
  icon: ReactNode
  badge: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-[#090d13] px-4 py-3.5 text-left transition hover:border-white/[0.16] hover:bg-white/[0.035]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-300 transition group-hover:text-white">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-white">{title}</span>
          <span className="text-[11px] font-medium text-slate-500">{badge}</span>
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
      </span>

      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.15]">
        <span className="h-2 w-2 rounded-full bg-transparent transition group-hover:bg-cyan-300" />
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300" />
    </button>
  )
}

function PaymentBenefit({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
      <span>{text}</span>
    </div>
  )
}

function OrderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-medium text-slate-200">{value}</span>
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
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-right text-sm font-medium ${valueClassName}`}>{value}</span>
    </div>
  )
}
