import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { processPagaleveCheckout } from "@/lib/payment/providers/pagaleve/process"

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId")?.trim() ?? ""
  const statusUrl = new URL("/checkout/status", request.url)

  if (!orderId) {
    statusUrl.searchParams.set("sync", "failed")
    return NextResponse.redirect(statusUrl)
  }

  statusUrl.searchParams.set("orderId", orderId)

  try {
    const order = await db.order.findFirst({
      where: { id: orderId, gateway: "PAGALEVE" },
      select: { gatewayReference: true },
    })
    if (!order?.gatewayReference) throw new Error("Checkout Pagaleve não encontrado.")

    await processPagaleveCheckout({
      checkoutId: order.gatewayReference,
      expectedOrderId: orderId,
      payload: {
        result: request.nextUrl.searchParams.get("result"),
      },
      source: "return",
    })
  } catch (error) {
    console.error("[checkout/pagaleve/return]", error)
    statusUrl.searchParams.set("sync", "pending")
  }

  return NextResponse.redirect(statusUrl)
}
