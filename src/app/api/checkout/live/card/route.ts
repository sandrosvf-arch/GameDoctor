import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { prepareLiveCheckout, setLiveCheckoutCookie } from "@/lib/live-checkout"
import { grantApprovedOrderAccess, sendLiveCheckoutAccessIfNeeded } from "@/lib/payment/live-checkout-approval"
import {
  createMercadoPagoOrder,
  getMercadoPagoPayerEmail,
  mapMercadoPagoMethodToInternal,
  mapMercadoPagoStatusToInternal,
} from "@/lib/payment/providers/mercadopago"

function normalizeText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const cardToken = normalizeText(body?.cardToken, 500)
  const planSlug = normalizeText(body?.planSlug, 120)
  const paymentMethodId = normalizeText(body?.paymentMethodId, 80)
  const idempotencyKey = normalizeText(body?.idempotencyKey, 120) || randomUUID()
  const installments = Number(body?.installments)

  if (!planSlug || !cardToken || !paymentMethodId || !Number.isInteger(installments) || installments < 1 || installments > 12) {
    return NextResponse.json({ error: "Preencha corretamente os dados do cartão." }, { status: 400 })
  }

  try {
    const prepared = await prepareLiveCheckout({
      request,
      identity: body?.customer,
      planSlug,
      accessToken: body?.accessToken,
      idempotencyKey,
      gateway: "MERCADOPAGO",
      paymentMethod: "CREDIT_CARD",
    })
    const { checkout, user } = prepared
    const existingOrder = await db.order.findUnique({
      where: { id: checkout.orderId },
      select: { gatewayReference: true, paymentStatus: true },
    })

    if (existingOrder?.gatewayReference) {
      return setLiveCheckoutCookie(
        NextResponse.json({ orderId: checkout.orderId, status: existingOrder.paymentStatus }),
        prepared.accessToken,
      )
    }

    const mpOrder = await createMercadoPagoOrder({
      externalReference: checkout.orderId,
      amount: checkout.quote.finalTotal,
      description: `${checkout.quote.plan.name} - ${checkout.quote.periodLabel}`,
      cardToken,
      paymentMethodId,
      installments,
      payer: { email: getMercadoPagoPayerEmail(user.email), identification: null },
      idempotencyKey,
    })
    const mpPayment = mpOrder.transactions?.payments?.[0]
    const status = mapMercadoPagoStatusToInternal(mpPayment?.status ?? mpOrder.status)
    const method = mapMercadoPagoMethodToInternal({
      paymentTypeId: mpPayment?.payment_method?.type,
      paymentMethodId: mpPayment?.payment_method?.id ?? paymentMethodId,
    }) ?? "CREDIT_CARD"
    const providerAmount = Number(mpOrder.total_paid_amount)
    const amount = Number.isFinite(providerAmount) && providerAmount > 0
      ? providerAmount
      : checkout.quote.finalTotal

    await db.$transaction([
      db.order.update({
        where: { id: checkout.orderId },
        data: { gatewayReference: mpOrder.id, paymentMethod: method, paymentStatus: status },
      }),
      db.payment.update({
        where: { id: checkout.paymentId! },
        data: {
          gatewayPaymentId: mpPayment?.id ? String(mpPayment.id) : null,
          paymentMethod: method,
          paymentStatus: status,
          installments,
          amount,
          paidAt: status === "APPROVED" ? new Date() : null,
        },
      }),
    ])

    if (status === "APPROVED") {
      await db.$transaction((tx) => grantApprovedOrderAccess(checkout.orderId, tx))
      await sendLiveCheckoutAccessIfNeeded(checkout.orderId).catch((error) => {
        console.error("[live-checkout/card/access-email]", error)
      })
    }

    return setLiveCheckoutCookie(NextResponse.json({ orderId: checkout.orderId, status }), prepared.accessToken)
  } catch (error) {
    console.error("[live-checkout/card]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível processar o pagamento." },
      { status: 400 },
    )
  }
}
