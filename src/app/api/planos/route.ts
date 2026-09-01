import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listPublicPlans } from "@/lib/checkout"

export async function GET() {
  const session = await auth()
  const plans = await listPublicPlans(session?.user?.id ?? null)

  if (!session?.user?.id) {
    return NextResponse.json({
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        benefits: plan.benefits,
        highlighted: plan.highlighted,
        currentPlan: null,
        offers: plan.offers.map(({ price: _price, cardEstimate: _cardEstimate, ...offer }) => offer),
      })),
    })
  }

  return NextResponse.json({ plans })
}
