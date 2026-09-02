import { NextRequest, NextResponse } from "next/server"
import { findLiveOrderByToken, LIVE_CHECKOUT_COOKIE } from "@/lib/live-checkout"
import { sendLiveCheckoutAccessIfNeeded } from "@/lib/payment/live-checkout-approval"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  try {
    const token = request.cookies.get(LIVE_CHECKOUT_COOKIE)?.value ?? ""
    const order = await findLiveOrderByToken(String(body?.orderId ?? "").trim(), token)
    if (!order) return NextResponse.json({ error: "Pedido não encontrado ou sessão expirada." }, { status: 404 })

    const result = await sendLiveCheckoutAccessIfNeeded(order.id, true)
    if (result.reason === "cooldown") {
      return NextResponse.json({ error: "Aguarde um minuto antes de reenviar." }, { status: 429 })
    }
    if (result.reason === "not_approved") {
      return NextResponse.json({ error: "O pagamento ainda não foi aprovado." }, { status: 409 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[live-checkout/resend-access]", error)
    return NextResponse.json({ error: "Não foi possível reenviar o acesso agora." }, { status: 400 })
  }
}
