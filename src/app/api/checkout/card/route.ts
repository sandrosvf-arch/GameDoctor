import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { grantOrderAccess } from "@/lib/payment/grant-order-access"
import { createPendingPlanCheckout, getAppBaseUrl, normalizeCheckoutPeriod } from "@/lib/checkout"
import {
  createMercadoPagoOrder,
  getMercadoPagoPayerEmail,
  createMercadoPagoSubscription,
  mapMercadoPagoMethodToInternal,
  mapMercadoPagoStatusToInternal,
} from "@/lib/payment/providers/mercadopago"

function normalizeString(value: unknown, maxLength = 200) {
  const normalized = String(value ?? "").trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? "Aluno",
    lastName: parts.slice(1).join(" ") || null,
  }
}

function normalizeCpf(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? ""
  return digits.length === 11 ? digits : null
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para continuar.", requiresAuth: true }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const planSlug = normalizeString(body?.planSlug, 120)
  const period = normalizeCheckoutPeriod(body?.period)
  const couponCode = normalizeString(body?.couponCode, 80)
  const cardToken = normalizeString(body?.cardToken, 500)
  const paymentMethodId = normalizeString(body?.paymentMethodId, 80)

  const installments = Number(body?.installments)
  const autoRenew = body?.autoRenew === true
  const idempotencyKey = normalizeString(body?.idempotencyKey, 120) ?? randomUUID()

  if (!planSlug || !period || !cardToken || !paymentMethodId) {
    return NextResponse.json({ error: "Preencha os dados do pagamento." }, { status: 400 })
  }

  if (!Number.isInteger(installments) || installments < 1 || installments > 12) {
    return NextResponse.json({ error: "Quantidade de parcelas inválida." }, { status: 400 })
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, cpf: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    const checkout = await createPendingPlanCheckout({
      userId: user.id,
      planSlug,
      period,
      couponCode,
      idempotencyKey,
    })

    if (checkout.quote.finalTotal <= 0) {
      return NextResponse.json({ error: "O valor final do pedido precisa ser maior que zero." }, { status: 400 })
    }

    const existingOrder = await db.order.findUnique({
      where: { id: checkout.orderId },
      select: {
        gatewayReference: true,
        paymentStatus: true,
        subscription: { select: { id: true } },
      },
    })

    if (existingOrder?.gatewayReference) {
      return NextResponse.json({
        orderId: checkout.orderId,
        paymentId: checkout.paymentId,
        status: existingOrder.paymentStatus,
        subscriptionCreated: Boolean(existingOrder.subscription),
      })
    }

    const mpOrder = await createMercadoPagoOrder({
      externalReference: checkout.orderId,
      amount: checkout.quote.finalTotal,
      description: checkout.quote.plan.name + " - " + checkout.quote.periodLabel,
      cardToken,
      paymentMethodId,

      installments,
      payer: {
        email: getMercadoPagoPayerEmail(user.email),
        identification: normalizeCpf(user.cpf)
          ? { type: "CPF", number: normalizeCpf(user.cpf)! }
          : null,
      },
      idempotencyKey,
    })

    const mpPayment = mpOrder.transactions?.payments?.[0]
    const internalStatus = mapMercadoPagoStatusToInternal(mpPayment?.status ?? mpOrder.status)
    const paymentMethod = mapMercadoPagoMethodToInternal({
      paymentTypeId: mpPayment?.payment_method?.type,
      paymentMethodId: mpPayment?.payment_method?.id ?? paymentMethodId,
    })
    const gatewayPaymentId = mpPayment?.id ? String(mpPayment.id) : null

    await db.$transaction([
      db.order.update({
        where: { id: checkout.orderId },
        data: {
          gatewayReference: mpOrder.id,
          paymentMethod: paymentMethod ?? "CREDIT_CARD",
          paymentStatus: internalStatus,
        },
      }),
      db.payment.update({
        where: { id: checkout.paymentId! },
        data: {
          gatewayPaymentId,
          paymentMethod: paymentMethod ?? "CREDIT_CARD",
          paymentStatus: internalStatus,
          installments,
          amount: checkout.quote.finalTotal,
        },
      }),
    ])

    if (internalStatus === "APPROVED") {
      await grantOrderAccess(checkout.orderId)
      if (checkout.quote.coupon.applied) {
        const coupon = await db.coupon.findUnique({ where: { code: checkout.quote.coupon.code! }, select: { id: true } })
        if (coupon) await db.coupon.update({ where: { id: coupon.id }, data: { usesCount: { increment: 1 } } }).catch(() => {})
      }
    }

    let subscriptionCreated = false
    let subscriptionWarning: string | null = null

    if (autoRenew && period === "annual" && internalStatus !== "REFUSED" && internalStatus !== "CANCELLED") {
      try {
        const startDate = new Date(Date.now() + checkout.quote.accessDurationDays * 24 * 60 * 60 * 1000)
        const subscription = await createMercadoPagoSubscription({
          externalReference: checkout.orderId,
          payerEmail: getMercadoPagoPayerEmail(user.email),
          reason: checkout.quote.plan.name + " - renovação anual",
          annualAmount: checkout.quote.subtotal,
          cardToken,
          startDate,
          backUrl: getAppBaseUrl() + "/minha-conta",
        })

        await db.subscription.create({
          data: {
            userId: user.id,
            planId: checkout.quote.plan.id,
            initialOrderId: checkout.orderId,
            gatewaySubscriptionId: subscription.id,
            period: "ANNUAL",
            amount: checkout.quote.subtotal,
            accessDurationDays: checkout.quote.accessDurationDays,
            status: subscription.status === "authorized" ? "ACTIVE" : "PENDING",
            autoRenew: true,
            startsAt: new Date(),
            nextBillingAt: subscription.next_payment_date
              ? new Date(subscription.next_payment_date)
              : startDate,
          },
        })

        const createdSubscription = await db.subscription.findUnique({
          where: { initialOrderId: checkout.orderId },
          select: { id: true },
        })

        if (createdSubscription) {
          await db.order.update({
            where: { id: checkout.orderId },
            data: { subscriptionId: createdSubscription.id },
          })
        }

        subscriptionCreated = true
      } catch (subscriptionError) {
        console.error("[checkout/card/subscription]", subscriptionError)
        subscriptionWarning = "O pagamento foi enviado, mas a renovação automática não pôde ser ativada."
      }
    }

    return NextResponse.json({
      orderId: checkout.orderId,
      paymentId: checkout.paymentId,
      status: internalStatus,
      subscriptionCreated,
      subscriptionWarning,
    })
  } catch (error) {
    console.error("[checkout/card]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível processar o pagamento." },
      { status: 400 }
    )
  }
}
