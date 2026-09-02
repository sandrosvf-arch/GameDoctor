import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { suspendUserAccess } from "@/lib/access"
import { grantApprovedOrderAccess, sendLiveCheckoutAccessIfNeeded } from "@/lib/payment/live-checkout-approval"
import {
  getMercadoPagoAuthorizedPayment,
  getMercadoPagoOrder,
  getMercadoPagoPayment,
  getMercadoPagoSubscription,
  mapMercadoPagoMethodToInternal,
  mapMercadoPagoStatusToInternal,
  normalizeMercadoPagoEventType,
  validateMercadoPagoWebhookSignature,
} from "@/lib/payment/providers/mercadopago"

function toJsonPayload(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

async function processLocalOrder(input: {
  orderId: string
  gatewayPaymentId: string | null
  status: string
  paymentMethod: "PIX" | "CREDIT_CARD" | "BOLETO" | null
  amount: number
  installments: number
  paidAt?: Date | null
  expiresAt?: Date | null
}) {
  const order = await db.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, userId: true, couponId: true },
  })

  if (!order) return

  const existingPayment = await db.payment.findFirst({
    where: { orderId: order.id, gateway: "MERCADOPAGO" },
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, paymentStatus: true },
  })

  const alreadyApproved = existingPayment?.paymentStatus === "APPROVED"

  if (existingPayment) {
    await db.payment.update({
      where: { id: existingPayment.id },
      data: {
        gatewayPaymentId: input.gatewayPaymentId,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.status as never,
        amount: input.amount,
        installments: input.installments,
        paidAt: input.paidAt ?? null,
        expiresAt: input.expiresAt ?? null,
      },
    })
  } else {
    await db.payment.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        gateway: "MERCADOPAGO",
        gatewayPaymentId: input.gatewayPaymentId,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.status as never,
        amount: input.amount,
        installments: input.installments,
        paidAt: input.paidAt ?? null,
        expiresAt: input.expiresAt ?? null,
      },
    })
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      paymentMethod: input.paymentMethod,
      paymentStatus: input.status as never,
    },
  })

  if (input.status === "APPROVED" && !alreadyApproved) {
    await db.$transaction((tx) => grantApprovedOrderAccess(order.id, tx))

    if (order.couponId) {
      await db.coupon.update({
        where: { id: order.couponId },
        data: { usesCount: { increment: 1 } },
      }).catch(() => {})
    }
  }

  if (input.status === "APPROVED") {
    await sendLiveCheckoutAccessIfNeeded(order.id).catch((error) => {
      console.error("[live-checkout/access-email]", error)
    })
  }

  if (input.status === "REFUNDED" || input.status === "CHARGEBACK") {
    await suspendUserAccess(order.userId, "Pedido " + order.id + ": " + input.status)
  }
}

async function processOrderNotification(gatewayOrderId: string) {
  const gatewayOrder = await getMercadoPagoOrder(gatewayOrderId)
  const localOrderId = String(gatewayOrder.external_reference ?? "").trim()

  if (!localOrderId) return

  const gatewayPayment = gatewayOrder.transactions?.payments?.[0]
  const status = mapMercadoPagoStatusToInternal(gatewayPayment?.status ?? gatewayOrder.status)
  const paymentMethod = mapMercadoPagoMethodToInternal({
    paymentTypeId: gatewayPayment?.payment_method?.type,
    paymentMethodId: gatewayPayment?.payment_method?.id,
  })

  await db.order.updateMany({
    where: { id: localOrderId },
    data: { gatewayReference: gatewayOrder.id },
  })

  await processLocalOrder({
    orderId: localOrderId,
    gatewayPaymentId: gatewayPayment?.id ? String(gatewayPayment.id) : null,
    status,
    paymentMethod,
    amount: Number(gatewayOrder.total_paid_amount ?? gatewayPayment?.amount ?? gatewayOrder.total_amount ?? 0),
    installments: gatewayPayment?.payment_method?.installments ?? 1,
  })
}

async function processLegacyPaymentNotification(paymentId: string) {
  const payment = await getMercadoPagoPayment(paymentId)
  const localOrderId = String(payment.external_reference ?? "").trim()
  if (!localOrderId) return

  await processLocalOrder({
    orderId: localOrderId,
    gatewayPaymentId: String(payment.id),
    status: mapMercadoPagoStatusToInternal(payment.status),
    paymentMethod: mapMercadoPagoMethodToInternal({
      paymentTypeId: payment.payment_type_id,
      paymentMethodId: payment.payment_method_id,
    }),
    amount: Number(payment.transaction_amount ?? 0),
    installments: Number(payment.installments ?? 1) || 1,
    paidAt: payment.date_approved ? new Date(payment.date_approved) : null,
    expiresAt: payment.date_of_expiration ? new Date(payment.date_of_expiration) : null,
  })
}

async function processRecurringPaymentNotification(paymentId: string) {
  const authorizedPayment = await getMercadoPagoAuthorizedPayment(paymentId)
  const gatewaySubscriptionId = String(authorizedPayment.preapproval_id ?? "").trim()

  if (!gatewaySubscriptionId) return

  const subscription = await db.subscription.findUnique({
    where: { gatewaySubscriptionId },
    include: { plan: true },
  })

  if (!subscription) return

  const status = mapMercadoPagoStatusToInternal(authorizedPayment.status)
  const gatewayPaymentId = String(authorizedPayment.payment?.id ?? authorizedPayment.id)
  const amount = Number(authorizedPayment.transaction_amount ?? subscription.amount)

  let order = await db.order.findFirst({
    where: { gatewayReference: gatewayPaymentId },
    select: { id: true },
  })

  if (!order) {
    order = await db.order.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        total: amount,
        finalTotal: amount,
        paymentMethod: "CREDIT_CARD",
        paymentStatus: "PENDING",
        gateway: "MERCADOPAGO",
        gatewayReference: gatewayPaymentId,
        orderItems: {
          create: {
            planId: subscription.planId,
            planPeriod: subscription.period,
            price: amount,
          },
        },
        payments: {
          create: {
            userId: subscription.userId,
            gateway: "MERCADOPAGO",
            gatewayPaymentId,
            paymentMethod: "CREDIT_CARD",
            paymentStatus: "PENDING",
            amount,
            installments: 1,
            paidAt: authorizedPayment.date_approved ? new Date(authorizedPayment.date_approved) : null,
          },
        },
      },
      select: { id: true },
    })
  }


  await processLocalOrder({
    orderId: order.id,
    gatewayPaymentId,
    status,
    paymentMethod: "CREDIT_CARD",
    amount,
    installments: 1,
    paidAt: authorizedPayment.date_approved ? new Date(authorizedPayment.date_approved) : null,
  })

  if (status === "APPROVED") {
    const gatewaySubscription = await getMercadoPagoSubscription(gatewaySubscriptionId).catch(() => null)
    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        nextBillingAt: gatewaySubscription?.next_payment_date
          ? new Date(gatewaySubscription.next_payment_date)
          : undefined,
      },
    })
  }


}

async function processSubscriptionNotification(subscriptionId: string) {
  const gatewaySubscription = await getMercadoPagoSubscription(subscriptionId)
  const localSubscription = await db.subscription.findUnique({
    where: { gatewaySubscriptionId: subscriptionId },
    select: { id: true },
  })

  if (!localSubscription) return

  const status =
    gatewaySubscription.status === "authorized" ? "ACTIVE"
      : gatewaySubscription.status === "paused" ? "PAUSED"
        : gatewaySubscription.status === "cancelled" ? "CANCELLED"
          : "PENDING"

  await db.subscription.update({
    where: { id: localSubscription.id },
    data: {
      status,
      nextBillingAt: gatewaySubscription.next_payment_date
        ? new Date(gatewaySubscription.next_payment_date)
        : undefined,
      cancelledAt: status === "CANCELLED" ? new Date() : undefined,
    },
  })
}

async function markWebhookProcessed(id: string) {
  await db.paymentWebhook.update({
    where: { id },
    data: { processed: true, processedAt: new Date() },
  })
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}))
  const dataId = request.nextUrl.searchParams.get("data.id")?.trim()
    || String((payload as { data?: { id?: string | number } })?.data?.id ?? "").trim()
  const type = (
    request.nextUrl.searchParams.get("type")
    || request.nextUrl.searchParams.get("topic")
    || String((payload as { type?: string; action?: string })?.type ?? (payload as { action?: string })?.action ?? "")
  ).toLowerCase()
  const xSignature = request.headers.get("x-signature") ?? undefined
  const xRequestId = request.headers.get("x-request-id") ?? undefined

  try {
    validateMercadoPagoWebhookSignature({
      signature: xSignature,
      requestId: xRequestId,
      dataId,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Assinatura inválida." }, { status: 401 })
  }

  if (!dataId) {
    return NextResponse.json({ error: "Evento sem identificador." }, { status: 400 })
  }

  const webhookRecord = await db.paymentWebhook.create({
    data: {
      gateway: "MERCADOPAGO",
      eventType: type || "unknown",
      payload: toJsonPayload({ request: payload, query: Object.fromEntries(request.nextUrl.searchParams.entries()) }),
      processed: false,
    },
  })

  try {
    if (type.includes("preapproval") || type.includes("subscription")) {
      await processSubscriptionNotification(dataId)
    } else if (type.includes("authorized_payment")) {
      await processRecurringPaymentNotification(dataId)
    } else if (type.includes("order")) {
      await processOrderNotification(dataId)
    } else {
      await processLegacyPaymentNotification(dataId)
    }

    await markWebhookProcessed(webhookRecord.id)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[webhooks/mercadopago]", error)
    return NextResponse.json({ error: "processing_failed" }, { status: 500 })
  }
}
