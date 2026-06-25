/**
 * POST /api/payment/webhooks
 *
 * Receives webhook notifications from the payment gateway.
 * Validates the signature, updates order status, and grants/revokes access.
 *
 * IMPORTANT: This endpoint must validate the webhook signature before processing.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getPaymentGateway } from "@/lib/payment"
import { grantAccess, resolvePlanAccessWindow, suspendUserAccess } from "@/lib/access"
import type { PaymentGatewayName } from "@/lib/payment"

export async function POST(request: Request) {
  const url = new URL(request.url)
  const gatewayParam = url.searchParams.get("gateway") as PaymentGatewayName | null

  if (!gatewayParam) {
    return NextResponse.json({ error: "MISSING_GATEWAY" }, { status: 400 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get("x-signature") ??
    request.headers.get("stripe-signature") ??
    request.headers.get("mercadopago-signature") ?? undefined

  // Persist raw webhook for audit/retry
  const webhookRecord = await db.paymentWebhook.create({
    data: {
      gateway: gatewayParam,
      eventType: "unknown",
      payload: JSON.parse(rawBody),
      processed: false,
    },
  })

  try {
    const gateway = getPaymentGateway(gatewayParam)
    const event = await gateway.parseWebhook(JSON.parse(rawBody), signature)

    // Update webhook record
    await db.paymentWebhook.update({
      where: { id: webhookRecord.id },
      data: { eventType: event.eventType },
    })

    // Find payment by gateway ID
    const payment = await db.payment.findFirst({
      where: { gatewayPaymentId: event.gatewayPaymentId },
      include: {
        order: {
          include: { orderItems: true, user: true },
        },
      },
    })

    if (!payment) {
      console.warn(`Webhook received for unknown payment: ${event.gatewayPaymentId}`)
      return NextResponse.json({ received: true })
    }

    const { order } = payment

    if (event.eventType === "payment_approved") {
      const alreadyApproved = payment.paymentStatus === "APPROVED"
      const approvedAt = payment.paidAt ?? new Date()

      // Update payment and order status
      await db.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: "APPROVED", paidAt: approvedAt },
      })
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: "APPROVED" },
      })

      if (!alreadyApproved) {
        // Grant access for each item in the order.
        // Plans can be time-based, so renewals extend from the current expiry when still active.
        for (const item of order.orderItems) {
          if (item.planId) {
            const plan = await db.plan.findUnique({
              where: { id: item.planId },
              select: {
                billingType: true,
                accessDurationDays: true,
              },
            })

            if (!plan) {
              continue
            }

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
              billingType: plan.billingType,
              accessDurationDays: plan.accessDurationDays,
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

          await grantAccess({
            userId: order.userId,
            courseId: item.courseId ?? undefined,
            accessType: "LIFETIME",
            origin: "PURCHASE",
            notes: `Liberado automaticamente pelo pagamento do pedido ${order.id}`,
          })
        }
      }
    } else if (
      event.eventType === "payment_refunded" ||
      event.eventType === "payment_chargeback"
    ) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus:
            event.eventType === "payment_chargeback" ? "CHARGEBACK" : "REFUNDED",
        },
      })
      await db.order.update({
        where: { id: order.id },
        data: {
          paymentStatus:
            event.eventType === "payment_chargeback" ? "CHARGEBACK" : "REFUNDED",
        },
      })
      // Suspend access
      await suspendUserAccess(order.userId, `Order ${order.id}: ${event.eventType}`)
    } else if (event.eventType === "payment_refused") {
      await db.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: "REFUSED" },
      })
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: "REFUSED" },
      })
    }

    // Mark webhook as processed
    await db.paymentWebhook.update({
      where: { id: webhookRecord.id },
      data: { processed: true, processedAt: new Date() },
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    // Return 200 to prevent gateway from retrying repeatedly
    return NextResponse.json({ received: true, error: "processing_failed" })
  }
}
