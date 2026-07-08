import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createPendingPlanCheckout, getAppBaseUrl, normalizeCheckoutPeriod } from "@/lib/checkout"
import { createMercadoPagoPreference } from "@/lib/payment/providers/mercadopago"
import { db } from "@/lib/db"

function splitName(fullName: string | null | undefined) {
  const name = (fullName ?? "").trim()
  if (!name) {
    return { name: "Aluno", surname: null as string | null }
  }

  const parts = name.split(/\s+/)
  return {
    name: parts[0] ?? "Aluno",
    surname: parts.slice(1).join(" ") || null,
  }
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para continuar.", requiresAuth: true }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const planSlug = String(body?.planSlug ?? "").trim()
  const period = normalizeCheckoutPeriod(body?.period)
  const couponCode = String(body?.couponCode ?? "").trim() || null

  if (!planSlug || !period) {
    return NextResponse.json({ error: "Plano ou período inválido." }, { status: 400 })
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    const checkout = await createPendingPlanCheckout({
      userId: session.user.id,
      planSlug,
      period,
      couponCode,
    })

    const baseUrl = getAppBaseUrl()
    const nameParts = splitName(user.name)
    const title = `${checkout.quote.plan.name} • ${checkout.quote.periodLabel}`

    const preference = await createMercadoPagoPreference({
      title,
      unitPrice: checkout.quote.finalTotal,
      payer: {
        name: nameParts.name,
        surname: nameParts.surname,
        email: user.email,
      },
      externalReference: checkout.orderId,
      notificationUrl: `${baseUrl}/api/webhooks/mercadopago`,
      successUrl: `${baseUrl}/checkout/status?orderId=${checkout.orderId}&source=mercadopago`,
      pendingUrl: `${baseUrl}/checkout/status?orderId=${checkout.orderId}&source=mercadopago`,
      failureUrl: `${baseUrl}/checkout/status?orderId=${checkout.orderId}&source=mercadopago`,
      metadata: {
        orderId: checkout.orderId,
        paymentId: checkout.paymentId,
        planId: checkout.quote.plan.id,
        planSlug: checkout.quote.plan.slug,
        period: checkout.quote.period,
        couponCode: checkout.quote.coupon.code,
      },
    })

    await db.order.update({
      where: { id: checkout.orderId },
      data: { gatewayReference: preference.id },
    })

    return NextResponse.json({
      orderId: checkout.orderId,
      paymentId: checkout.paymentId,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point ?? null,
    })
  } catch (error) {
    console.error("[checkout/preference]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível iniciar o checkout." },
      { status: 400 }
    )
  }
}
