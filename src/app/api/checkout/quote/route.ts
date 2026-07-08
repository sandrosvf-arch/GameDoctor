import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { buildCheckoutQuote, normalizeCheckoutPeriod } from "@/lib/checkout"

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
    const quote = await buildCheckoutQuote({
      userId: session.user.id,
      planSlug,
      period,
      couponCode,
    })

    return NextResponse.json({ quote })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível calcular o checkout." },
      { status: 400 }
    )
  }
}
