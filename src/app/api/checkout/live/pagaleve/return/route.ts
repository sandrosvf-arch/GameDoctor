import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { processPagaleveCheckout } from "@/lib/payment/providers/pagaleve/process"

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId")?.trim() ?? ""
  const statusUrl = new URL("/checkout/live/status", request.url)
  statusUrl.searchParams.set("orderId", orderId)

  try {
    const order = await db.order.findFirst({ where: { id: orderId, checkoutChannel: "LIVE" } })
    if (!order?.gatewayReference || order.gateway !== "PAGALEVE") throw new Error("Pedido não encontrado.")
    await processPagaleveCheckout({
      checkoutId: order.gatewayReference,
      expectedOrderId: order.id,
      payload: { result: request.nextUrl.searchParams.get("result") },
      source: "return",
    })
  } catch (error) {
    console.error("[live-checkout/pagaleve/return]", error)
    statusUrl.searchParams.set("sync", "pending")
  }

  return NextResponse.redirect(statusUrl)
}
