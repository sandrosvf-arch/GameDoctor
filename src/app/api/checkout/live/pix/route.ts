import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { prepareLiveCheckout, setLiveCheckoutCookie } from "@/lib/live-checkout"
import {
  createMercadoPagoPixPayment,
  getMercadoPagoPayerEmail,
  mapMercadoPagoStatusToInternal,
} from "@/lib/payment/providers/mercadopago"

function text(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const cpf = String(body?.cpf ?? "").replace(/\D/g, "").slice(0, 11)
  const planSlug = text(body?.planSlug, 120)
  const idempotencyKey = text(body?.idempotencyKey, 120) || randomUUID()
  if (!planSlug || cpf.length !== 11) return NextResponse.json({ error: "Informe o plano e um CPF válido." }, { status: 400 })

  try {
    const prepared = await prepareLiveCheckout({
      request,
      identity: body?.customer,
      planSlug,
      accessToken: body?.accessToken,
      idempotencyKey,
      gateway: "MERCADOPAGO",
      paymentMethod: "PIX",
    })
    const { checkout, user } = prepared
    const existingPayment = await db.payment.findUnique({
      where: { id: checkout.paymentId! },
      select: { paymentStatus: true, pixQrCode: true, pixCopyPaste: true, expiresAt: true },
    })
    if (existingPayment?.pixQrCode && existingPayment.pixCopyPaste) {
      return setLiveCheckoutCookie(NextResponse.json({
        orderId: checkout.orderId,
        status: existingPayment.paymentStatus,
        pix: {
          qrCodeBase64: existingPayment.pixQrCode,
          copyPaste: existingPayment.pixCopyPaste,
          expiresAt: existingPayment.expiresAt?.toISOString() ?? null,
        },
      }), prepared.accessToken)
    }

    if (prepared.createdUser && !user.cpf) {
      await db.user.update({ where: { id: user.id }, data: { cpf } })
    }
    const payment = await createMercadoPagoPixPayment({
      externalReference: checkout.orderId,
      amount: checkout.quote.finalTotal,
      description: `${checkout.quote.plan.name} - ${checkout.quote.periodLabel}`,
      payer: {
        email: getMercadoPagoPayerEmail(user.email),
        identification: { type: "CPF", number: cpf },
      },
      idempotencyKey,
    })
    const qrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null
    const copyPaste = payment.point_of_interaction?.transaction_data?.qr_code ?? null
    if (!payment.id || !qrCodeBase64 || !copyPaste) throw new Error("O Mercado Pago não retornou o QR Code.")

    const status = mapMercadoPagoStatusToInternal(payment.status)
    const expiresAt = payment.date_of_expiration ? new Date(payment.date_of_expiration) : null
    await db.$transaction([
      db.order.update({
        where: { id: checkout.orderId },
        data: { gatewayReference: String(payment.id), paymentMethod: "PIX", paymentStatus: status },
      }),
      db.payment.update({
        where: { id: checkout.paymentId! },
        data: {
          gatewayPaymentId: String(payment.id),
          paymentMethod: "PIX",
          paymentStatus: status,
          amount: checkout.quote.finalTotal,
          installments: 1,
          pixQrCode: qrCodeBase64,
          pixCopyPaste: copyPaste,
          expiresAt,
        },
      }),
    ])

    return setLiveCheckoutCookie(NextResponse.json({
      orderId: checkout.orderId,
      status,
      pix: { qrCodeBase64, copyPaste, expiresAt: expiresAt?.toISOString() ?? null },
    }), prepared.accessToken)
  } catch (error) {
    console.error("[live-checkout/pix]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível gerar o Pix." },
      { status: 400 },
    )
  }
}
