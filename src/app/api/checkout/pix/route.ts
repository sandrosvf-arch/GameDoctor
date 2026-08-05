import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createPendingPlanCheckout } from "@/lib/checkout"
import {
  createMercadoPagoPixPayment,
  getMercadoPagoPayerEmail,
  mapMercadoPagoMethodToInternal,
  mapMercadoPagoStatusToInternal,
} from "@/lib/payment/providers/mercadopago"

function normalizeString(value: unknown, maxLength = 200) {
  const normalized = String(value ?? "").trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

function normalizeCpf(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "")
  return digits.length === 11 ? digits : null
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para continuar.", requiresAuth: true }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const planSlug = normalizeString(body?.planSlug, 120)
  const period = normalizeString(body?.period, 20)
  const couponCode = normalizeString(body?.couponCode, 80)
  const cpfFromRequest = normalizeCpf(body?.cpf)
  const idempotencyKey = normalizeString(body?.idempotencyKey, 120) ?? randomUUID()

  if (!planSlug || (period !== "annual" && period !== "monthly")) {
    return NextResponse.json({ error: "Plano ou período inválido." }, { status: 400 })
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, cpf: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    const cpf = normalizeCpf(user.cpf) ?? cpfFromRequest
    if (!cpf) {
      return NextResponse.json({ error: "Informe um CPF válido para pagar com Pix." }, { status: 400 })
    }

    if (!user.cpf) {
      await db.user.update({
        where: { id: user.id },
        data: { cpf },
      })
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

    const existingPayment = checkout.paymentId
      ? await db.payment.findUnique({
          where: { id: checkout.paymentId },
          select: {
            paymentStatus: true,
            pixQrCode: true,
            pixCopyPaste: true,
            expiresAt: true,
          },
        })
      : null

    if (existingPayment?.pixQrCode && existingPayment.pixCopyPaste) {
      return NextResponse.json({
        orderId: checkout.orderId,
        paymentId: checkout.paymentId,
        status: existingPayment.paymentStatus,
        pix: {
          qrCodeBase64: existingPayment.pixQrCode,
          copyPaste: existingPayment.pixCopyPaste,
          expiresAt: existingPayment.expiresAt?.toISOString() ?? null,
        },
      })
    }

    const payment = await createMercadoPagoPixPayment({
      externalReference: checkout.orderId,
      amount: checkout.quote.finalTotal,
      description: checkout.quote.plan.name + " - " + checkout.quote.periodLabel,
      payer: {
        email: getMercadoPagoPayerEmail(user.email),
        identification: { type: "CPF", number: cpf },
      },
      idempotencyKey,
    })

    const qrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null
    const copyPaste = payment.point_of_interaction?.transaction_data?.qr_code ?? null

    if (!payment.id || !qrCodeBase64 || !copyPaste) {
      throw new Error("O Mercado Pago não retornou os dados do QR Code.")
    }

    const paymentStatus = mapMercadoPagoStatusToInternal(payment.status)
    const paymentMethod = mapMercadoPagoMethodToInternal({
      paymentTypeId: payment.payment_type_id,
      paymentMethodId: payment.payment_method_id ?? "pix",
    }) ?? "PIX"
    const expiresAt = payment.date_of_expiration ? new Date(payment.date_of_expiration) : null
    const gatewayPaymentId = String(payment.id)

    await db.$transaction([
      db.order.update({
        where: { id: checkout.orderId },
        data: {
          gatewayReference: gatewayPaymentId,
          paymentMethod,
          paymentStatus,
        },
      }),
      db.payment.update({
        where: { id: checkout.paymentId! },
        data: {
          gatewayPaymentId,
          paymentMethod,
          paymentStatus,
          installments: 1,
          amount: checkout.quote.finalTotal,
          pixQrCode: qrCodeBase64,
          pixCopyPaste: copyPaste,
          expiresAt,
        },
      }),
    ])

    return NextResponse.json({
      orderId: checkout.orderId,
      paymentId: checkout.paymentId,
      status: paymentStatus,
      pix: {
        qrCodeBase64,
        copyPaste,
        expiresAt: expiresAt?.toISOString() ?? null,
      },
    })
  } catch (error) {
    console.error("[checkout/pix]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível gerar o Pix." },
      { status: 400 }
    )
  }
}