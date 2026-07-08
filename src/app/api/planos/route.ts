import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listPublicPlans } from "@/lib/checkout"

export async function GET() {
  const session = await auth()
  const plans = await listPublicPlans(session?.user?.id ?? null)

  return NextResponse.json({ plans })
}
