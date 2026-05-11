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
import { grantAccess, suspendUserAccess } from "@/lib/access"
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
      // Update payment and order status
      await db.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: "APPROVED", paidAt: new Date() },
      })
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: "APPROVED" },
      })

      // Grant access for each item in the order
      for (const item of order.orderItems) {
        await grantAccess({
          userId: order.userId,
          courseId: item.courseId ?? undefined,
          planId: item.planId ?? undefined,
          accessType: "LIFETIME", // TODO: determine from plan billing type
          origin: "PURCHASE",
        })
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
