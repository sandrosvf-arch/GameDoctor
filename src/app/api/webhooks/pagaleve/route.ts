import { NextRequest, NextResponse } from "next/server"
import {
  processPagaleveCheckout,
  validatePagaleveWebhookSecret,
} from "@/lib/payment/providers/pagaleve/process"

export async function POST(request: NextRequest) {
  if (!validatePagaleveWebhookSecret(request.nextUrl.searchParams.get("secret"))) {
    return NextResponse.json({ error: "Webhook não autorizado." }, { status: 401 })
  }

  const payload = await request.json().catch(() => null)
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {}
  const checkoutId = String(data.id ?? data.checkout_id ?? "").trim()

  if (!checkoutId) {
    return NextResponse.json({ error: "Evento sem checkout." }, { status: 400 })
  }

  try {
    const result = await processPagaleveCheckout({
      checkoutId,
      expectedOrderId: String(data.orderReference ?? data.order_reference ?? "").trim() || null,
      payload,
      source: "webhook",
    })

    return NextResponse.json({ received: true, status: result.status })
  } catch (error) {
    console.error("[webhooks/pagaleve]", error)
    return NextResponse.json({ error: "processing_failed" }, { status: 500 })
  }
}
