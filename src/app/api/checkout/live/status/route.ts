import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { findLiveOrderByToken, LIVE_CHECKOUT_COOKIE } from "@/lib/live-checkout"
import { sendLiveCheckoutAccessIfNeeded } from "@/lib/payment/live-checkout-approval"

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId")?.trim() ?? ""
  const token = request.cookies.get(LIVE_CHECKOUT_COOKIE)?.value ?? ""

  try {
    const authorizedOrder = await findLiveOrderByToken(orderId, token)
    if (!authorizedOrder) return NextResponse.json({ error: "Pedido não encontrado ou sessão expirada." }, { status: 404 })

    const order = await db.order.findUnique({
      where: { id: authorizedOrder.id },
      select: {
        id: true,
        paymentStatus: true,
        paymentMethod: true,
        finalTotal: true,
        createdAt: true,
        accessEmailSentAt: true,
        user: { select: { email: true } },
        orderItems: {
          take: 1,
          select: { plan: { select: { name: true } }, planPeriod: true },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            paymentStatus: true,
            paymentMethod: true,
            amount: true,
            installments: true,
            pixQrCode: true,
            pixCopyPaste: true,
            expiresAt: true,
          },
        },
      },
    })
    if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })

    let accessEmailSent = Boolean(order.accessEmailSentAt)
    if (order.paymentStatus === "APPROVED" && !accessEmailSent) {
      const emailResult = await sendLiveCheckoutAccessIfNeeded(order.id).catch((error) => {
        console.error("[live-checkout/status/access-email]", error)
        return null
      })
      accessEmailSent = emailResult?.sent === true
    }
    const payment = order.payments[0] ?? null

    return NextResponse.json({
      order: {
        id: order.id,
        status: payment?.paymentStatus ?? order.paymentStatus,
        paymentMethod: payment?.paymentMethod ?? order.paymentMethod,
        total: Number(payment?.amount ?? order.finalTotal),
        installments: payment?.installments ?? 1,
        createdAt: order.createdAt.toISOString(),
        planName: order.orderItems[0]?.plan?.name ?? "Plano GameDoctor",
        email: order.user.email.replace(/^(.{2}).*(@.*)$/, "$1***$2"),
        accessEmailSent,
        pix: payment?.pixQrCode && payment.pixCopyPaste
          ? {
              qrCodeBase64: payment.pixQrCode,
              copyPaste: payment.pixCopyPaste,
              expiresAt: payment.expiresAt?.toISOString() ?? null,
            }
          : null,
      },
    })
  } catch {
    return NextResponse.json({ error: "Pedido não encontrado ou sessão expirada." }, { status: 404 })
  }
}
