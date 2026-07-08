import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

function normalizeStatusLabel(status: string) {
  if (status === "APPROVED") return "Pagamento aprovado"
  if (status === "PENDING") return "Aguardando pagamento"
  if (status === "REFUSED") return "Pagamento recusado"
  if (status === "CANCELLED") return "Pagamento cancelado"
  if (status === "REFUNDED") return "Pagamento reembolsado"
  if (status === "CHARGEBACK") return "Chargeback"
  if (status === "EXPIRED") return "Pagamento expirado"
  if (status === "FAILED") return "Falha no pagamento"
  return "Pagamento em análise"
}

export async function GET(request: NextRequest) {
  const session = await auth()
  const orderId = request.nextUrl.searchParams.get("orderId")?.trim() ?? ""
  const externalReference = request.nextUrl.searchParams.get("externalReference")?.trim() ?? ""

  if (!orderId && !externalReference) {
    return NextResponse.json({ error: "Pedido não informado." }, { status: 400 })
  }

  const order = await db.order.findFirst({
    where: orderId ? { id: orderId } : { gatewayReference: externalReference },
    include: {
      coupon: {
        select: {
          code: true,
        },
      },
      orderItems: {
        take: 1,
        include: {
          plan: {
            select: {
              name: true,
              slug: true,
              annualAccessDurationDays: true,
              monthlyAccessDurationDays: true,
            },
          },
        },
      },
      payments: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: {
          id: true,
          paymentMethod: true,
          paymentStatus: true,
          gatewayPaymentId: true,
          installments: true,
          paidAt: true,
          expiresAt: true,
          amount: true,
          createdAt: true,
        },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
  }

  if (!session?.user?.id || session.user.id !== order.userId) {
    return NextResponse.json(
      {
        error: "Você precisa entrar com a conta desta compra para ver os detalhes.",
        requiresAuth: true,
        canView: false,
      },
      { status: 403 }
    )
  }

  const item = order.orderItems[0] ?? null
  const payment = order.payments[0] ?? null
  const effectiveStatus = payment?.paymentStatus ?? order.paymentStatus

  return NextResponse.json({
    canView: true,
    order: {
      id: order.id,
      paymentStatus: effectiveStatus,
      paymentStatusLabel: normalizeStatusLabel(effectiveStatus),
      total: Number(order.total),
      discountTotal: Number(order.discountTotal),
      finalTotal: Number(order.finalTotal),
      paymentMethod: payment?.paymentMethod ?? order.paymentMethod ?? null,
      gateway: order.gateway,
      gatewayReference: order.gatewayReference,
      createdAt: order.createdAt.toISOString(),
      couponCode: order.coupon?.code ?? null,
      item: item
        ? {
            name: item.plan?.name ?? "Plano",
            slug: item.plan?.slug ?? null,
            period: item.planPeriod === "MONTHLY" ? "monthly" : "annual",
            periodLabel: item.planPeriod === "MONTHLY" ? "Mensal" : "Anual",
            amount: Number(item.price),
          }
        : null,
      payment: payment
        ? {
            id: payment.id,
            status: payment.paymentStatus,
            method: payment.paymentMethod,
            gatewayPaymentId: payment.gatewayPaymentId,
            installments: payment.installments,
            amount: Number(payment.amount),
            paidAt: payment.paidAt?.toISOString() ?? null,
            expiresAt: payment.expiresAt?.toISOString() ?? null,
            createdAt: payment.createdAt.toISOString(),
          }
        : null,
    },
  })
}
