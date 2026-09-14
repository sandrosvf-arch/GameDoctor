import { db } from "@/lib/db"
import type { CheckoutQuote } from "@/lib/checkout"
import { getAppBaseUrl } from "@/lib/checkout"
import {
  createMercadoPagoSubscription,
  getMercadoPagoPayerEmail,
} from "@/lib/payment/providers/mercadopago"

export async function createMonthlySubscription(input: {
  orderId: string
  paymentId: string
  quote: CheckoutQuote
  payerEmail: string
  cardToken: string
  idempotencyKey: string
}) {
  const existing = await db.subscription.findUnique({
    where: { initialOrderId: input.orderId },
    select: { id: true, gatewaySubscriptionId: true },
  })

  if (existing) return existing

  const gatewaySubscription = await createMercadoPagoSubscription({
    externalReference: input.orderId,
    payerEmail: getMercadoPagoPayerEmail(input.payerEmail),
    reason: `${input.quote.plan.name} - renovação mensal`,
    amount: input.quote.cardTotal,
    frequency: 1,
    cardToken: input.cardToken,
    startDate: new Date(),
    backUrl: getAppBaseUrl() + "/minha-conta",
    idempotencyKey: input.idempotencyKey,
  })

  if (!gatewaySubscription.id) {
    throw new Error("O Mercado Pago não retornou o identificador da assinatura.")
  }

  return db.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        userId: (await tx.order.findUniqueOrThrow({
          where: { id: input.orderId },
          select: { userId: true },
        })).userId,
        planId: input.quote.plan.id,
        initialOrderId: input.orderId,
        gatewaySubscriptionId: gatewaySubscription.id,
        period: "MONTHLY",
        amount: input.quote.cardTotal,
        accessDurationDays: input.quote.accessDurationDays,
        status: "PENDING",
        autoRenew: true,
        startsAt: new Date(),
        nextBillingAt: gatewaySubscription.next_payment_date
          ? new Date(gatewaySubscription.next_payment_date)
          : null,
      },
      select: { id: true, gatewaySubscriptionId: true },
    })

    await Promise.all([
      tx.order.update({
        where: { id: input.orderId },
        data: {
          subscriptionId: subscription.id,
          gatewayReference: gatewaySubscription.id,
          paymentMethod: "CREDIT_CARD",
          paymentStatus: "PENDING",
          finalTotal: input.quote.cardTotal,
        },
      }),
      tx.payment.update({
        where: { id: input.paymentId },
        data: {
          paymentMethod: "CREDIT_CARD",
          paymentStatus: "PENDING",
          installments: 1,
          amount: input.quote.cardTotal,
        },
      }),
    ])

    return subscription
  })
}
