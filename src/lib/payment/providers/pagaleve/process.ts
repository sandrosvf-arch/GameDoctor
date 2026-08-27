import { timingSafeEqual } from "crypto"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { grantOrderAccess } from "@/lib/payment/grant-order-access"
import {
  capturePagaleveCheckout,
  getPagaleveCheckout,
  getPagaleveCheckoutAmount,
  getPagaleveCheckoutState,
  getPagaleveOrderReference,
  getPagalevePaymentId,
  type PagaleveCheckout,
} from "@/lib/payment/providers/pagaleve"

function toJsonPayload(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function toCents(value: unknown) {
  return Math.round(Number(value) * 100)
}

function normalizePayload(payload: unknown) {
  const data = payload && typeof payload === "object"
    ? payload as Record<string, unknown>
    : {}

  return {
    checkoutId: String(data.id ?? data.checkout_id ?? "").trim(),
    orderId: String(data.orderReference ?? data.order_reference ?? "").trim(),
    state: String(data.state ?? data.status ?? "").trim().toUpperCase(),
    type: String(data.type ?? "").trim().toUpperCase(),
    amount: Number.isFinite(Number(data.amount)) ? Number(data.amount) : null,
  }
}

function mapStateToStatus(state: string, type: string) {
  if (type === "DECLINED" || state === "DECLINED" || state === "REFUSED") return "REFUSED" as const
  if (state === "CANCELED" || state === "CANCELLED") return "CANCELLED" as const
  if (state === "EXPIRED") return "EXPIRED" as const
  return "PENDING" as const
}

export function validatePagaleveWebhookSecret(receivedSecret: string | null) {
  const expectedSecret = process.env.PAGALEVE_WEBHOOK_SECRET?.trim()
  if (!expectedSecret || !receivedSecret) return false

  const expected = Buffer.from(expectedSecret)
  const received = Buffer.from(receivedSecret)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

async function getVerifiedCheckout(input: {
  checkoutId: string
  expectedOrderId?: string | null
  payload?: unknown
}) {
  const payload = normalizePayload(input.payload)
  const checkoutId = input.checkoutId || payload.checkoutId
  if (!checkoutId) throw new Error("Checkout Pagaleve não informado.")

  const checkout = await getPagaleveCheckout(checkoutId)
  const providerCheckoutId = String(checkout.checkout_id ?? checkout.id ?? "").trim()
  if (providerCheckoutId && providerCheckoutId !== checkoutId) {
    throw new Error("O checkout retornado pela Pagaleve não confere.")
  }

  const orderId = input.expectedOrderId || getPagaleveOrderReference(checkout) || payload.orderId
  if (!orderId) throw new Error("Pedido local não informado pela Pagaleve.")

  const order = await db.order.findFirst({
    where: {
      id: orderId,
      gateway: "PAGALEVE",
      gatewayReference: checkoutId,
    },
    select: {
      id: true,
      userId: true,
      couponId: true,
      finalTotal: true,
      paymentStatus: true,
    },
  })

  if (!order) throw new Error("Pedido Pagaleve não encontrado.")

  const providerReference = getPagaleveOrderReference(checkout)
  if (providerReference && providerReference !== order.id) {
    throw new Error("A referência retornada pela Pagaleve não confere.")
  }
  const metadataOrderId = String(checkout.metadata?.orderId ?? "").trim()
  if (metadataOrderId && metadataOrderId !== order.id) {
    throw new Error("O pedido retornado pela Pagaleve não confere.")
  }

  const providerUserId = String(checkout.metadata?.userId ?? "").trim()
  if (providerUserId && providerUserId !== order.userId) {
    throw new Error("O usuário retornado pela Pagaleve não confere.")
  }

  const expectedAmount = toCents(order.finalTotal)
  const providerAmount = getPagaleveCheckoutAmount(checkout) ?? payload.amount
  if (providerAmount !== null && Math.round(providerAmount) !== expectedAmount) {
    throw new Error("O valor retornado pela Pagaleve não confere.")
  }

  return {
    checkout,
    checkoutId,
    order,
    state: getPagaleveCheckoutState(checkout) || payload.state,
    type: payload.type || String(checkout.type ?? "").toUpperCase(),
    amountInCents: expectedAmount,
  }
}

async function createWebhookRecord(input: {
  checkoutId: string
  state: string
  payload: unknown
  source: "webhook" | "return"
}) {
  const externalEventId = `${input.checkoutId}:${input.state || "UNKNOWN"}`

  return db.paymentWebhook.upsert({
    where: { externalEventId },
    create: {
      gateway: "PAGALEVE",
      externalEventId,
      eventType: input.state || "UNKNOWN",
      payload: toJsonPayload({ source: input.source, data: input.payload }),
      processed: false,
    },
    update: {},
    select: { id: true, processed: true },
  })
}

async function updateTerminalStatus(input: {
  webhookId: string
  orderId: string
  status: "CANCELLED" | "EXPIRED" | "REFUSED"
}) {
  await db.$transaction(async (tx) => {
    const claimed = await tx.paymentWebhook.updateMany({
      where: { id: input.webhookId, processed: false },
      data: { processed: true, processedAt: new Date() },
    })
    if (claimed.count === 0) return

    await tx.order.update({
      where: { id: input.orderId },
      data: { paymentStatus: input.status, paymentMethod: "PIX_INSTALLMENTS" },
    })
    await tx.payment.updateMany({
      where: { orderId: input.orderId, gateway: "PAGALEVE" },
      data: { paymentStatus: input.status, paymentMethod: "PIX_INSTALLMENTS" },
    })
  })
}

async function approveOrder(input: {
  webhookId: string
  orderId: string
  paymentId: string
  amount: number
}) {
  await db.$transaction(async (tx) => {
    const claimed = await tx.paymentWebhook.updateMany({
      where: { id: input.webhookId, processed: false },
      data: { processed: true, processedAt: new Date() },
    })
    if (claimed.count === 0) return

    const payment = await tx.payment.findFirst({
      where: { orderId: input.orderId, gateway: "PAGALEVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, paymentStatus: true },
    })
    if (!payment) throw new Error("Pagamento local da Pagaleve não encontrado.")

    const alreadyApproved = payment.paymentStatus === "APPROVED"

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId: input.paymentId,
        paymentMethod: "PIX_INSTALLMENTS",
        paymentStatus: "APPROVED",
        amount: input.amount,
        installments: 1,
        paidAt: new Date(),
      },
    })
    await tx.order.update({
      where: { id: input.orderId },
      data: {
        paymentMethod: "PIX_INSTALLMENTS",
        paymentStatus: "APPROVED",
      },
    })

    if (!alreadyApproved) {
      await grantOrderAccess(input.orderId, tx)

      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        select: { couponId: true },
      })
      if (order?.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usesCount: { increment: 1 } },
        })
      }
    }
  })
}

export async function processPagaleveCheckout(input: {
  checkoutId: string
  expectedOrderId?: string | null
  payload?: unknown
  source: "webhook" | "return"
}) {
  const verified = await getVerifiedCheckout(input)
  const webhook = await createWebhookRecord({
    checkoutId: verified.checkoutId,
    state: verified.state,
    payload: input.payload ?? verified.checkout,
    source: input.source,
  })

  if (webhook.processed) {
    return { orderId: verified.order.id, status: verified.order.paymentStatus }
  }

  if (verified.state === "AUTHORIZED") {
    const payment = await capturePagaleveCheckout({
      checkoutId: verified.checkoutId,
      orderId: verified.order.id,
      amountInCents: verified.amountInCents,
    })
    const paymentId = getPagalevePaymentId(payment)
    if (!paymentId) throw new Error("A Pagaleve não retornou o identificador do pagamento.")

    await approveOrder({
      webhookId: webhook.id,
      orderId: verified.order.id,
      paymentId,
      amount: verified.amountInCents / 100,
    })
    return { orderId: verified.order.id, status: "APPROVED" as const }
  }

  const status = mapStateToStatus(verified.state, verified.type)
  if (status !== "PENDING") {
    await updateTerminalStatus({
      webhookId: webhook.id,
      orderId: verified.order.id,
      status,
    })
  } else {
    await db.paymentWebhook.updateMany({
      where: { id: webhook.id, processed: false },
      data: { processed: true, processedAt: new Date() },
    })
  }

  return { orderId: verified.order.id, status }
}
