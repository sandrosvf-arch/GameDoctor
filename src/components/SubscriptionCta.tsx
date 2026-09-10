import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { SubscriptionCtaBanner } from "@/components/SubscriptionCtaBanner"

export async function SubscriptionCta() {
  const session = await auth()
  const role = session?.user?.role

  if (role === "ADMIN" || role === "EDITOR") return null

  if (session?.user?.id) {
    const now = new Date()
    const activeAccess = await db.accessPermission.findFirst({
      where: {
        userId: session.user.id,
        planId: { not: null },
        status: "ACTIVE",
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    })

    if (activeAccess) return null
  }

  return <SubscriptionCtaBanner />
}
