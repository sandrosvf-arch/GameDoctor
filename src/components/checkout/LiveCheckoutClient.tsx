"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react"
import { Check, Copy, CreditCard, Loader2, MapPin, QrCode, ShieldCheck, Wallet } from "lucide-react"
import type { CheckoutQuote } from "@/lib/checkout"
import { isValidBrazilianPhone, normalizeBrazilianPhone } from "@/lib/phone"

const mercadoPagoPublicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim() ?? ""
type PaymentMethod = "card" | "pix" | "pagaleve"
type Address = { postalCode: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string }
type Profile = { name: string; email: string; phone: string; cpf: string; billingAddress: Address | null }

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function randomHex(bytes = 32) {
  const values = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("")
}

function newAttempt() {
  return { idempotencyKey: crypto.randomUUID(), accessToken: randomHex() }
}

function Field({ label, value, onChange, ...props }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  inputMode?: "text" | "email" | "tel" | "numeric"
  autoComplete?: string
  placeholder?: string
  onBlur?: () => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-white/[0.09] bg-[#090e15] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
      />
    </label>
  )
}

function MethodButton({ active, icon, title, description, onClick }: {
  active: boolean
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-20 w-full items-center gap-3 rounded-xl border px-4 text-left transition ${active ? "border-cyan-400/60 bg-cyan-400/[0.08]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${active ? "bg-cyan-300 text-slate-950" : "bg-white/[0.06] text-slate-300"}`}>{icon}</span>
      <span>
        <strong className="block text-sm text-white">{title}</strong>
        <span className="mt-1 block text-xs leading-4 text-slate-500">{description}</span>
      </span>
    </button>
  )
}

export function LiveCheckoutClient({ quote, planSlug, initialProfile }: { quote: CheckoutQuote; planSlug: string; initialProfile: Profile | null }) {
  const [customer, setCustomer] = useState({
    name: initialProfile?.name ?? "",
    email: initialProfile?.email ?? "",
    phone: initialProfile?.phone ?? "",
  })
  const [cpf, setCpf] = useState(initialProfile?.cpf ?? "")
  const [address, setAddress] = useState<Address>(initialProfile?.billingAddress ?? {
    postalCode: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  })
  const [method, setMethod] = useState<PaymentMethod>("card")
  const [sdkReady, setSdkReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pix, setPix] = useState<{ orderId: string; qrCodeBase64: string; copyPaste: string; expiresAt: string | null } | null>(null)
  const [copied, setCopied] = useState(false)
  const [loadingCep, setLoadingCep] = useState(false)
  const [cepError, setCepError] = useState<string | null>(null)
  const attemptRef = useRef(newAttempt())
  const submittingRef = useRef(false)
  const cardContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mercadoPagoPublicKey) return
    initMercadoPago(mercadoPagoPublicKey)
    setSdkReady(true)
  }, [])

  const identityValid = customer.name.trim().length >= 2
    && /^\S+@\S+\.\S+$/.test(customer.email.trim())
    && isValidBrazilianPhone(customer.phone)

  function chooseMethod(next: PaymentMethod) {
    if (submittingRef.current) return
    setMethod(next)
    setError(null)
    setPix(null)
    attemptRef.current = newAttempt()
  }

  function commonBody() {
    return {
      planSlug,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: normalizeBrazilianPhone(customer.phone),
      },
      accessToken: attemptRef.current.accessToken,
      idempotencyKey: attemptRef.current.idempotencyKey,
    }
  }

  function statusUrl(orderId: string) {
    const params = new URLSearchParams({ orderId })
    return `/checkout/live/status?${params.toString()}`
  }

  function validateIdentity() {
    if (identityValid) return true
    const message = customer.name.trim().length < 2
      ? "Informe seu nome completo."
      : !/^\S+@\S+\.\S+$/.test(customer.email.trim())
        ? "Informe um e-mail válido."
        : "Informe um celular válido com DDD (ex.: 41999999999)."
    setError(message)
    document.getElementById("live-customer")?.scrollIntoView({ behavior: "smooth", block: "center" })
    return false
  }

  const submitCard = useCallback(async (formData: { token: string; payment_method_id: string; installments: number }) => {
    if (submittingRef.current || !validateIdentity()) return
    submittingRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch("/api/checkout/live/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...commonBody(),
          cardToken: formData.token,
          paymentMethodId: formData.payment_method_id,
          installments: formData.installments,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível processar o pagamento.")
      window.location.assign(statusUrl(data.orderId))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível processar o pagamento.")
      attemptRef.current = newAttempt()
      submittingRef.current = false
      setSubmitting(false)
    }
  }, [customer, identityValid, planSlug])

  async function submitPix() {
    if (submittingRef.current || !validateIdentity()) return
    if (cpf.replace(/\D/g, "").length !== 11) return setError("Informe um CPF válido.")
    submittingRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch("/api/checkout/live/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...commonBody(), cpf }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível gerar o Pix.")
      setPix({ orderId: data.orderId, ...data.pix })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível gerar o Pix.")
      attemptRef.current = newAttempt()
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  async function submitPagaleve() {
    if (submittingRef.current || !validateIdentity()) return
    if (cpf.replace(/\D/g, "").length !== 11) return setError("Informe um CPF válido.")
    if (address.postalCode.replace(/\D/g, "").length !== 8 || !address.street || !address.number || !address.neighborhood || !address.city || address.state.length !== 2) {
      return setError("Preencha o endereço completo.")
    }
    submittingRef.current = true
    setSubmitting(true)
    setRedirecting(false)
    setError(null)
    let started = false
    try {
      const response = await fetch("/api/checkout/live/pagaleve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...commonBody(), cpf, billingAddress: address }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.checkoutUrl) throw new Error(data?.error ?? "Não foi possível abrir a Pagaleve.")
      started = true
      setRedirecting(true)
      window.location.assign(data.checkoutUrl)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível abrir a Pagaleve.")
      attemptRef.current = newAttempt()
    } finally {
      if (!started) {
        submittingRef.current = false
        setSubmitting(false)
      }
    }
  }

  useEffect(() => {
    if (method !== "pagaleve") return
    const cep = address.postalCode.replace(/\D/g, "")
    if (cep.length !== 8) return setCepError(null)
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoadingCep(true)
      setCepError(null)
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal })
        const data = await response.json().catch(() => null)
        if (!response.ok || data?.erro) throw new Error()
        setAddress((current) => ({
          ...current,
          street: String(data.logradouro ?? current.street),
          neighborhood: String(data.bairro ?? current.neighborhood),
          city: String(data.localidade ?? current.city),
          state: String(data.uf ?? current.state).slice(0, 2).toUpperCase(),
        }))
      } catch (requestError) {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) setCepError("CEP não encontrado.")
      } finally {
        if (!controller.signal.aborted) setLoadingCep(false)
      }
    }, 350)
    return () => { window.clearTimeout(timeout); controller.abort() }
  }, [address.postalCode, method])

  useEffect(() => {
    const container = cardContainerRef.current
    if (!container || method !== "card") return
    const cleanLabels = () => {
      container.querySelectorAll("option").forEach((option) => {
        const current = option.textContent ?? ""
        const cleaned = current.replace(/\s*\(Sem acréscimo\)/gi, "").trim()
        if (cleaned !== current) option.textContent = cleaned
      })
    }
    cleanLabels()
    const observer = new MutationObserver(cleanLabels)
    observer.observe(container, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [identityValid, method])

  useEffect(() => {
    if (!pix?.orderId) return
    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/checkout/live/status?orderId=${encodeURIComponent(pix.orderId)}`, { cache: "no-store" })
      const data = await response.json().catch(() => null)
      if (data?.order?.status && data.order.status !== "PENDING") window.location.assign(statusUrl(pix.orderId))
    }, 5000)
    return () => window.clearInterval(interval)
  }, [pix?.orderId])

  const cardInitialization = useMemo(() => ({ amount: quote.finalTotal, payer: { email: customer.email.trim() } }), [customer.email, quote.finalTotal])
  const cardCustomization = useMemo(() => ({ paymentMethods: { minInstallments: 1, maxInstallments: Math.min(12, quote.installments.max) }, visual: { hideFormTitle: true } }), [quote.installments.max])

  return (
    <main className="relative overflow-hidden px-4 pb-28 pt-8 sm:px-6 lg:py-12 lg:pb-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_20%_0%,rgba(6,182,212,0.16),transparent_36%),radial-gradient(circle_at_80%_10%,rgba(245,158,11,0.10),transparent_30%)]" />
      <div className="relative mx-auto max-w-3xl">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Oferta especial da live</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Seu acesso profissional começa agora.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Complete seus dados, escolha como pagar e receba seu acesso por e-mail após a aprovação.</p>
        </div>

        <div className="block">
          <div className="space-y-5">
            <section className="rounded-2xl border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(8,25,34,.98),rgba(9,13,20,.98))] p-5 shadow-2xl shadow-cyan-950/20 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Acesso anual completo</p>
                  <h2 className="mt-2 truncate text-xl font-semibold text-white sm:text-2xl">{quote.plan.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">12 meses de acesso a todo o conteúdo.</p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="text-xs text-slate-500">No cartão</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">12x de {currency(quote.cardEstimate.installmentAmount)}</p>
                  <p className="mt-1 text-xs text-slate-500">ou {currency(quote.finalTotal)} à vista</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.08] pt-4 text-xs text-slate-300">
                {quote.plan.benefits.slice(0, 4).map((benefit) => <span key={benefit} className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-cyan-300" />{benefit}</span>)}
              </div>
            </section>

            <section id="live-customer" className="rounded-2xl border border-white/[0.08] bg-[#0b1017]/95 p-5 shadow-2xl shadow-black/20 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-300 text-sm font-bold text-slate-950">1</span>
                <div><h2 className="font-semibold">Seus dados de acesso</h2><p className="text-xs text-slate-500">Usaremos estes dados para criar sua conta.</p></div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label="Nome completo" value={customer.name} onChange={(name) => setCustomer((current) => ({ ...current, name }))} autoComplete="name" /></div>
                <Field label="E-mail" type="email" value={customer.email} onChange={(email) => setCustomer((current) => ({ ...current, email }))} inputMode="email" autoComplete="email" />
                <Field
                  label="Celular com DDD"
                  value={customer.phone}
                  onChange={(phone) => setCustomer((current) => ({ ...current, phone: normalizeBrazilianPhone(phone.replace(/\D/g, "").slice(0, 13)) }))}
                  onBlur={() => setCustomer((current) => ({ ...current, phone: normalizeBrazilianPhone(current.phone) }))}
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="41999999999"
                />
              </div>
            </section>

            <section id="live-payment" className="rounded-2xl border border-white/[0.08] bg-[#0b1017]/95 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-300 text-sm font-bold text-slate-950">2</span>
                <div><h2 className="font-semibold">Escolha como pagar</h2><p className="text-xs text-slate-500">Pagamento seguro e acesso liberado após confirmação.</p></div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <MethodButton active={method === "card"} icon={<CreditCard className="h-5 w-5" />} title="Cartão" description="Parcele em até 12x" onClick={() => chooseMethod("card")} />
                <MethodButton active={method === "pix"} icon={<QrCode className="h-5 w-5" />} title="Pix" description={`${currency(quote.finalTotal)} à vista`} onClick={() => chooseMethod("pix")} />
                <MethodButton active={method === "pagaleve"} icon={<Wallet className="h-5 w-5" />} title="Parcelamento via Pix" description={`${currency(quote.installmentTotal)} no total, pela Pagaleve`} onClick={() => chooseMethod("pagaleve")} />
              </div>

              <div className="mt-5 border-t border-white/[0.07] pt-5">
                {method === "card" && (
                  !identityValid ? <p className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-4 text-sm text-cyan-100">Preencha seus dados acima para abrir o pagamento com cartão.</p>
                  : !mercadoPagoPublicKey ? <p className="text-sm text-amber-200">Pagamento com cartão temporariamente indisponível.</p>
                  : <div ref={cardContainerRef} className="overflow-hidden rounded-xl bg-white p-2 sm:p-3">
                      {sdkReady ? <CardPayment initialization={cardInitialization} customization={cardCustomization} locale="pt-BR" onSubmit={submitCard} onError={() => setError("Não foi possível carregar o formulário do cartão.")} /> : <div className="flex min-h-28 items-center justify-center text-slate-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</div>}
                    </div>
                )}

                {method === "pix" && (
                  <div className="space-y-4">
                    {!pix ? <>
                      <Field label="CPF do pagador" value={cpf} onChange={(value) => setCpf(value.replace(/\D/g, "").slice(0, 11))} inputMode="numeric" placeholder="00000000000" />
                      <button type="button" onClick={() => void submitPix()} disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 font-semibold text-slate-950 disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}Gerar Pix de {currency(quote.finalTotal)}</button>
                    </> : <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.04] p-4">
                      <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
                        <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix" className="mx-auto aspect-square w-44 rounded-lg bg-white p-2" />
                        <div><h3 className="font-semibold">Escaneie e conclua o pagamento</h3><p className="mt-2 text-sm text-slate-400">Esta página acompanha a confirmação automaticamente.</p><div className="mt-4 flex gap-2"><input readOnly value={pix.copyPaste} className="min-w-0 flex-1 rounded-lg bg-black/30 px-3 text-xs text-slate-300" /><button type="button" onClick={() => { void navigator.clipboard.writeText(pix.copyPaste); setCopied(true) }} className="flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-slate-950">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copiado" : "Copiar"}</button></div></div>
                      </div>
                    </div>}
                  </div>
                )}

                {method === "pagaleve" && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-xl border border-pink-400/20 bg-pink-400/[0.05] p-4"><Wallet className="mt-0.5 h-5 w-5 text-pink-300" /><div><strong className="text-sm">Parcelamento via Pix - Pagaleve</strong><p className="mt-1 text-xs leading-5 text-slate-400">A quantidade e as datas serão apresentadas antes da confirmação no ambiente da Pagaleve.</p></div></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="CPF" value={cpf} onChange={(value) => setCpf(value.replace(/\D/g, "").slice(0, 11))} inputMode="numeric" />
                      <div><Field label="CEP" value={address.postalCode} onChange={(postalCode) => setAddress((current) => ({ ...current, postalCode: postalCode.replace(/\D/g, "").slice(0, 8) }))} inputMode="numeric" />{loadingCep && <p className="mt-1 text-xs text-slate-500">Consultando CEP...</p>}{cepError && <p className="mt-1 text-xs text-red-300">{cepError}</p>}</div>
                      <Field label="Rua" value={address.street} onChange={(street) => setAddress((current) => ({ ...current, street }))} />
                      <Field label="Número" value={address.number} onChange={(number) => setAddress((current) => ({ ...current, number }))} />
                      <Field label="Complemento" value={address.complement} onChange={(complement) => setAddress((current) => ({ ...current, complement }))} />
                      <Field label="Bairro" value={address.neighborhood} onChange={(neighborhood) => setAddress((current) => ({ ...current, neighborhood }))} />
                      <Field label="Cidade" value={address.city} onChange={(city) => setAddress((current) => ({ ...current, city }))} />
                      <Field label="Estado" value={address.state} onChange={(state) => setAddress((current) => ({ ...current, state: state.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase() }))} />
                    </div>
                      <button type="button" onClick={() => void submitPagaleve()} disabled={submitting || redirecting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ff0a8a] font-semibold text-white disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}{redirecting ? "Abrindo ambiente seguro..." : `Ver condições de parcelamento (${currency(quote.installmentTotal)})`}</button>
                  </div>
                )}
                {submitting && method === "card" && <p className="mt-3 flex items-center gap-2 text-sm text-cyan-200"><Loader2 className="h-4 w-4 animate-spin" />Processando seu pagamento...</p>}
                {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm text-red-100">{error}</p>}
                <p className="mt-4 text-center text-[11px] leading-5 text-slate-600">Ao continuar, você concorda com os <Link href="/termos-de-uso" className="underline hover:text-slate-300">Termos de Uso</Link> e a <Link href="/politica-privacidade" className="underline hover:text-slate-300">Política de Privacidade</Link>.</p>
              </div>
            </section>
          </div>

          <aside className="hidden">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Acesso anual completo</p>
            <h2 className="mt-2 text-2xl font-semibold">{quote.plan.name}</h2>
            {quote.plan.description && <p className="mt-3 text-sm leading-6 text-slate-400">{quote.plan.description}</p>}
            <div className="my-5 border-y border-white/[0.08] py-5">
              <p className="text-sm text-slate-400">No cartão</p>
              <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-white">12x de {currency(quote.cardEstimate.installmentAmount)}</p>
              <p className="mt-2 text-xs text-slate-500">ou {currency(quote.finalTotal)} à vista no Pix</p>
            </div>
            <ul className="space-y-3">{quote.plan.benefits.map((benefit) => <li key={benefit} className="flex gap-2 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />{benefit}</li>)}</ul>
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" /><p className="text-xs leading-5 text-slate-400">Pagamento protegido. O acesso é enviado após a confirmação.</p></div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600"><MapPin className="h-3.5 w-3.5" />Compra processada no Brasil</div>
          </aside>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.1] bg-[#090d14]/95 px-4 py-3 shadow-[0_-12px_35px_rgba(0,0,0,.35)] backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Total</p><p className="truncate text-lg font-semibold text-white sm:text-xl">{currency(quote.finalTotal)} <span className="text-xs font-normal text-slate-500">ou 12x de {currency(quote.cardEstimate.installmentAmount)}</span></p></div>
          <button type="button" onClick={() => document.getElementById("live-payment")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="h-11 shrink-0 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 sm:px-8">Continuar compra</button>
        </div>
      </div>
    </main>
  )
}
