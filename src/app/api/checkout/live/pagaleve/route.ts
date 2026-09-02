import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAppBaseUrl } from "@/lib/checkout"
import { prepareLiveCheckout, setLiveCheckoutCookie } from "@/lib/live-checkout"
import {
  createPagaleveCheckout,
  getPagaleveCheckoutId,
  getPagaleveCheckoutUrl,
} from "@/lib/payment/providers/pagaleve"

function normalizeText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength)
}

function normalizeAddress(value: unknown) {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {}
  return {
    postalCode: String(data.postalCode ?? "").replace(/\D/g, "").slice(0, 8),
    street: normalizeText(data.street, 160),
    number: normalizeText(data.number, 30),
    complement: normalizeText(data.complement, 100) || null,
    neighborhood: normalizeText(data.neighborhood, 100),
    city: normalizeText(data.city, 100),
    state: normalizeText(data.state, 2).toUpperCase(),
  }
}

function getPublicBaseUrl() {
  const baseUrl = getAppBaseUrl()
  const url = new URL(baseUrl)
  if (url.protocol !== "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    throw new Error("A Pagaleve exige NEXT_PUBLIC_APP_URL com uma URL HTTPS pública.")
  }
  return baseUrl
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const cpf = String(body?.cpf ?? "").replace(/\D/g, "").slice(0, 11)
  const planSlug = normalizeText(body?.planSlug, 120)
  const idempotencyKey = normalizeText(body?.idempotencyKey, 120) || randomUUID()
  const address = normalizeAddress(body?.billingAddress)
  if (!planSlug || cpf.length !== 11) return NextResponse.json({ error: "Informe o plano e um CPF válido." }, { status: 400 })
  if (
    address.postalCode.length !== 8 || !address.street || !address.number
    || !address.neighborhood || !address.city || address.state.length !== 2
  ) {
    return NextResponse.json({ error: "Preencha o endereço de cobrança completo." }, { status: 400 })
  }

  try {
    const webhookSecret = process.env.PAGALEVE_WEBHOOK_SECRET?.trim()
    if (!webhookSecret) throw new Error("O webhook da Pagaleve não está configurado.")
    const baseUrl = getPublicBaseUrl()
    const prepared = await prepareLiveCheckout({
      request,
      identity: body?.customer,
      planSlug,
      accessToken: body?.accessToken,
      idempotencyKey,
      gateway: "PAGALEVE",
      paymentMethod: "PIX_INSTALLMENTS",
    })
    const { checkout, user } = prepared
    const existingOrder = await db.order.findUnique({
      where: { id: checkout.orderId },
      select: { gatewayCheckoutUrl: true },
    })
    if (existingOrder?.gatewayCheckoutUrl) {
      return setLiveCheckoutCookie(
        NextResponse.json({ orderId: checkout.orderId, checkoutUrl: existingOrder.gatewayCheckoutUrl }),
        prepared.accessToken,
      )
    }

    if (prepared.createdUser) {
      await db.$transaction([
        db.user.update({ where: { id: user.id }, data: { cpf } }),
        db.userBillingAddress.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...address },
          update: address,
        }),
      ])
    }

    const returnUrl = new URL("/api/checkout/live/pagaleve/return", baseUrl)
    returnUrl.searchParams.set("orderId", checkout.orderId)
    const pagaleveCheckout = await createPagaleveCheckout({
      orderId: checkout.orderId,
      userId: user.id,
      amountInCents: Math.round(checkout.quote.installmentTotal * 100),
      description: `${checkout.quote.plan.name} - ${checkout.quote.periodLabel}`,
      sku: checkout.quote.plan.id,
      shopper: {
        name: user.name,
        email: user.email,
        phone: prepared.createdUser ? prepared.user.phone ?? "" : String(body?.customer?.phone ?? "").replace(/\D/g, ""),
        cpf,
        billingAddress: address,
      },
      approveUrl: `${returnUrl.toString()}&result=approved`,
      cancelUrl: `${returnUrl.toString()}&result=cancelled`,
      webhookUrl: `${baseUrl}/api/webhooks/pagaleve?secret=${encodeURIComponent(webhookSecret)}`,
      idempotencyKey,
    })
    const checkoutId = getPagaleveCheckoutId(pagaleveCheckout)
    const checkoutUrl = getPagaleveCheckoutUrl(pagaleveCheckout)
    if (!checkoutId || !checkoutUrl) throw new Error("A Pagaleve não retornou os dados do checkout.")

    await db.$transaction([
      db.order.update({
        where: { id: checkout.orderId },
        data: {
          gatewayReference: checkoutId,
          gatewayCheckoutUrl: checkoutUrl,
          paymentMethod: "PIX_INSTALLMENTS",
          finalTotal: checkout.quote.installmentTotal,
        },
      }),
      db.payment.update({
        where: { id: checkout.paymentId! },
        data: { gateway: "PAGALEVE", paymentMethod: "PIX_INSTALLMENTS", amount: checkout.quote.installmentTotal },
      }),
    ])
    return setLiveCheckoutCookie(NextResponse.json({ orderId: checkout.orderId, checkoutUrl }), prepared.accessToken)
  } catch (error) {
    console.error("[live-checkout/pagaleve]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível iniciar o Parcelamento via Pix." },
      { status: 400 },
    )
  }
}
