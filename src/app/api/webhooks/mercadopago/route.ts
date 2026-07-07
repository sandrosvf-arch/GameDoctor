import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { grantAccess, resolvePlanAccessWindow, suspendUserAccess } from "@/lib/access"
import {
  getMercadoPagoPayment,
  mapMercadoPagoMethodToInternal,
  mapMercadoPagoStatusToInternal,
  normalizeMercadoPagoEventType,
  validateMercadoPagoWebhookSignature,
} from "@/lib/payment/providers/mercadopago"

function toJsonPayload(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

async function grantOrderAccess(orderId: string) {
  const approvedAt = new Date()
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      orderItems: {
        include: {
          plan: true,
          course: true,
        },
      },
    },
  })

  if (!order) return

  for (const item of order.orderItems) {
    if (item.planId && item.plan) {
      const billingType = item.planPeriod === "MONTHLY" ? "MONTHLY" : "YEARLY"
      const accessDurationDays =
        item.planPeriod === "MONTHLY"
          ? item.plan.monthlyAccessDurationDays ?? 30
          : item.plan.annualAccessDurationDays

      const existingAccess = await db.accessPermission.findFirst({
        where: {
          userId: order.userId,
          planId: item.planId,
          status: "ACTIVE",
        },
        orderBy: [{ expiresAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          expiresAt: true,
        },
      })

      if (existingAccess?.expiresAt === null) {
        continue
      }

      const renewalBaseDate =
        existingAccess?.expiresAt && existingAccess.expiresAt > approvedAt
          ? existingAccess.expiresAt
          : approvedAt

      const accessWindow = resolvePlanAccessWindow({
        billingType,
        accessDurationDays,
        startDate: renewalBaseDate,
      })

      if (existingAccess) {
        await db.accessPermission.update({
          where: { id: existingAccess.id },
          data: {
            accessType: accessWindow.accessType,
            expiresAt: accessWindow.expiresAt,
            notes: `Renovado automaticamente pelo pagamento do pedido ${order.id}`,
          },
        })
      } else {
        await grantAccess({
          userId: order.userId,
          planId: item.planId,
          accessType: accessWindow.accessType,
          origin: "PURCHASE",
          expiresAt: accessWindow.expiresAt,
          notes: `Liberado automaticamente pelo pagamento do pedido ${order.id}`,
        })
      }

      continue
    }

    if (item.courseId) {
      await grantAccess({
        userId: order.userId,
        courseId: item.courseId,
        accessType: "LIFETIME",
        origin: "PURCHASE",
        notes: `Liberado automaticamente pelo pagamento do pedido ${order.id}`,
      })
    }
  }
}

export async function POST(request: NextRequest) {
  const dataId = request.nextUrl.searchParams.get("data.id")?.trim() ?? ""
  const xSignature = request.headers.get("x-signature") ?? undefined
  const xRequestId = request.headers.get("x-request-id") ?? undefined
  const payload = await request.json().catch(() => ({}))

  try {
    validateMercadoPagoWebhookSignature({
      signature: xSignature,
      requestId: xRequestId,
      dataId,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assinatura inválida." },
      { status: 401 }
    )
  }

  const paymentId = String((payload as { data?: { id?: string | number } })?.data?.id ?? dataId ?? "").trim()

  if (!paymentId) {
    return NextResponse.json({ error: "Pagamento não informado." }, { status: 400 })
  }

  const paymentDetails = await getMercadoPagoPayment(paymentId)
  const eventType = normalizeMercadoPagoEventType(paymentDetails.status)

  const webhookRecord = await db.paymentWebhook.create({
    data: {
      gateway: "MERCADOPAGO",
      eventType,
      payload: toJsonPayload({
        request: payload,
        query: Object.fromEntries(request.nextUrl.searchParams.entries()),
        payment: paymentDetails,
      }),
      processed: false,
    },
  })

  try {
    const orderId = String(paymentDetails.external_reference ?? "").trim()

    if (!orderId) {
      await db.paymentWebhook.update({
        where: { id: webhookRecord.id },
        data: { processed: true, processedAt: new Date() },
      })

      return NextResponse.json({ received: true })
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        couponId: true,
        paymentStatus: true,
      },
    })

    if (!order) {
      await db.paymentWebhook.update({
        where: { id: webhookRecord.id },
        data: { processed: true, processedAt: new Date() },
      })

      return NextResponse.json({ received: true })
    }

    const internalStatus = mapMercadoPagoStatusToInternal(paymentDetails.status)
    const paymentMethod = mapMercadoPagoMethodToInternal({
      paymentTypeId: paymentDetails.payment_type_id,
      paymentMethodId: paymentDetails.payment_method_id,
    })

    const existingPayment = await db.payment.findFirst({
      where: {
        orderId: order.id,
        gateway: "MERCADOPAGO",
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        paymentStatus: true,
      },
    })

    const alreadyApproved = existingPayment?.paymentStatus === "APPROVED"
    const paidAt = paymentDetails.date_approved ? new Date(paymentDetails.date_approved) : null
    const expiresAt = paymentDetails.date_of_expiration ? new Date(paymentDetails.date_of_expiration) : null
    const amount = Number(paymentDetails.transaction_amount ?? 0)
    const installments = Number(paymentDetails.installments ?? 1) || 1

    if (existingPayment) {
      await db.payment.update({
        where: { id: existingPayment.id },
        data: {
          gatewayPaymentId: String(paymentDetails.id),
          paymentMethod,
          paymentStatus: internalStatus,
          amount,
          installments,
          paidAt,
          expiresAt,
        },
      })
    } else {
      await db.payment.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          gateway: "MERCADOPAGO",
          gatewayPaymentId: String(paymentDetails.id),
          paymentMethod,
          paymentStatus: internalStatus,
          amount,
          installments,
          paidAt,
          expiresAt,
        },
      })
    }

    await db.order.update({
      where: { id: order.id },
      data: {
        paymentMethod,
        paymentStatus: internalStatus,
      },
    })

    if (internalStatus === "APPROVED" && !alreadyApproved) {
      await grantOrderAccess(order.id)

      if (order.couponId) {
        await db.coupon.update({
          where: { id: order.couponId },
          data: {
            usesCount: {
              increment: 1,
            },
          },
        }).catch(() => {})
      }
    }

    if (internalStatus === "REFUNDED" || internalStatus === "CHARGEBACK") {
      await suspendUserAccess(order.userId, `Pedido ${order.id}: ${internalStatus}`)
    }

    await db.paymentWebhook.update({
      where: { id: webhookRecord.id },
      data: { processed: true, processedAt: new Date() },
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[webhooks/mercadopago]", error)
    return NextResponse.json({ error: "processing_failed" }, { status: 500 })
  }
}
