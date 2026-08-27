import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createPendingPlanCheckout, getAppBaseUrl } from "@/lib/checkout"
import {
  createPagaleveCheckout,
  getPagaleveCheckoutId,
  getPagaleveCheckoutUrl,
} from "@/lib/payment/providers/pagaleve"

function normalizeText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength)
}

function normalizeDigits(value: unknown, maxLength: number) {
  return String(value ?? "").replace(/\D/g, "").slice(0, maxLength)
}

function normalizeAddress(value: unknown) {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {}
  return {
    postalCode: normalizeDigits(data.postalCode, 8),
    street: normalizeText(data.street, 160),
    number: normalizeText(data.number, 30),
    complement: normalizeText(data.complement, 100) || null,
    neighborhood: normalizeText(data.neighborhood, 100),
    city: normalizeText(data.city, 100),
    state: normalizeText(data.state, 2).toUpperCase(),
  }
}

function getPagaleveCallbackBaseUrl() {
  const baseUrl = getAppBaseUrl()

  try {
    const url = new URL(baseUrl)
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1"
    if (url.protocol !== "https:" || isLocal) throw new Error()
    return baseUrl
  } catch {
    throw new Error(
      "Para usar a Pagaleve, configure NEXT_PUBLIC_APP_URL com uma URL HTTPS pública. Em desenvolvimento, use um túnel como ngrok ou Cloudflare Tunnel."
    )
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const planSlug = normalizeText(body?.planSlug, 120)
  const period = normalizeText(body?.period, 20)
  const couponCode = normalizeText(body?.couponCode, 80)
  const idempotencyKey = normalizeText(body?.idempotencyKey, 120) || randomUUID()
  const cpf = normalizeDigits(body?.cpf, 11)
  const phone = normalizeDigits(body?.phone, 11)
  const address = normalizeAddress(body?.billingAddress)

  if (!planSlug || period !== "annual") {
    return NextResponse.json({ error: "O Parcelamento via Pix está disponível apenas no plano anual." }, { status: 400 })
  }
  if (cpf.length !== 11) {
    return NextResponse.json({ error: "Informe um CPF válido." }, { status: 400 })
  }
  if (phone.length < 10) {
    return NextResponse.json({ error: "Informe um telefone válido." }, { status: 400 })
  }
  if (
    address.postalCode.length !== 8
    || !address.street
    || !address.number
    || !address.neighborhood
    || !address.city
    || address.state.length !== 2
  ) {
    return NextResponse.json({ error: "Preencha o endereço de cobrança completo." }, { status: 400 })
  }

  try {
    const webhookSecret = process.env.PAGALEVE_WEBHOOK_SECRET?.trim()
    if (!webhookSecret) throw new Error("O webhook da Pagaleve não está configurado.")
    const baseUrl = getPagaleveCallbackBaseUrl()

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    })
    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { cpf, phone },
      }),
      db.userBillingAddress.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...address },
        update: address,
      }),
    ])

    const checkout = await createPendingPlanCheckout({
      userId: user.id,
      planSlug,
      period: "annual",
      couponCode,
      idempotencyKey,
      gateway: "PAGALEVE",
      paymentMethod: "PIX_INSTALLMENTS",
    })

    if (checkout.quote.finalTotal <= 0) {
      return NextResponse.json({ error: "O valor final do pedido precisa ser maior que zero." }, { status: 400 })
    }

    const existingOrder = await db.order.findUnique({
      where: { id: checkout.orderId },
      select: { gatewayCheckoutUrl: true },
    })
    if (existingOrder?.gatewayCheckoutUrl) {
      return NextResponse.json({ orderId: checkout.orderId, checkoutUrl: existingOrder.gatewayCheckoutUrl })
    }

    const returnBase = `${baseUrl}/api/checkout/pagaleve/return?orderId=${encodeURIComponent(checkout.orderId)}`
    const pagaleveCheckout = await createPagaleveCheckout({
      orderId: checkout.orderId,
      userId: user.id,
      amountInCents: Math.round(checkout.quote.finalTotal * 100),
      description: `${checkout.quote.plan.name} - ${checkout.quote.periodLabel}`,
      sku: checkout.quote.plan.id,
      shopper: {
        name: user.name ?? "Aluno",
        email: user.email,
        phone,
        cpf,
        billingAddress: address,
      },
      approveUrl: `${returnBase}&result=approved`,
      cancelUrl: `${returnBase}&result=cancelled`,
      webhookUrl: `${baseUrl}/api/webhooks/pagaleve?secret=${encodeURIComponent(webhookSecret)}`,
      idempotencyKey,
    })
    const checkoutId = getPagaleveCheckoutId(pagaleveCheckout)
    const checkoutUrl = getPagaleveCheckoutUrl(pagaleveCheckout)
    if (!checkoutId || !checkoutUrl) {
      throw new Error("A Pagaleve não retornou os dados do checkout.")
    }

    await db.$transaction([
      db.order.update({
        where: { id: checkout.orderId },
        data: {
          gatewayReference: checkoutId,
          gatewayCheckoutUrl: checkoutUrl,
          paymentMethod: "PIX_INSTALLMENTS",
        },
      }),
      db.payment.update({
        where: { id: checkout.paymentId! },
        data: {
          gateway: "PAGALEVE",
          paymentMethod: "PIX_INSTALLMENTS",
          amount: checkout.quote.finalTotal,
        },
      }),
    ])

    return NextResponse.json({ orderId: checkout.orderId, checkoutUrl })
  } catch (error) {
    console.error("[checkout/pagaleve]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível iniciar o Parcelamento via Pix." },
      { status: 400 },
    )
  }
}
