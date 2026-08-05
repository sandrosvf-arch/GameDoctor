import { db } from "@/lib/db"
import { grantAccess, resolvePlanAccessWindow } from "@/lib/access"

export async function grantOrderAccess(orderId: string) {
  const approvedAt = new Date()
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: { include: { plan: true, course: true } },
    },
  })

  if (!order) return

  for (const item of order.orderItems) {
    if (item.planId && item.plan) {
      const billingType = item.planPeriod === "MONTHLY" ? "MONTHLY" : "YEARLY"
      const accessDurationDays = item.planPeriod === "MONTHLY"
        ? item.plan.monthlyAccessDurationDays ?? 30
        : item.plan.annualAccessDurationDays

      const existingAccess = await db.accessPermission.findFirst({
        where: { userId: order.userId, planId: item.planId, status: "ACTIVE" },
        orderBy: [{ expiresAt: "desc" }, { createdAt: "desc" }],
        select: { id: true, expiresAt: true },
      })

      if (existingAccess?.expiresAt === null) continue

      const renewalBaseDate =
        existingAccess?.expiresAt && existingAccess.expiresAt > approvedAt
          ? existingAccess.expiresAt
          : approvedAt

      const accessWindow = resolvePlanAccessWindow({
        billingType,
        accessDurationDays,
        startDate: renewalBaseDate,
      })

      if (existingAccess) {
        await db.accessPermission.update({
          where: { id: existingAccess.id },
          data: {
            accessType: accessWindow.accessType,
            expiresAt: accessWindow.expiresAt,
            status: "ACTIVE",
            notes: "Acesso renovado pelo pagamento do pedido " + order.id,
          },
        })
      } else {
        await grantAccess({
          userId: order.userId,
          planId: item.planId,
          accessType: accessWindow.accessType,
          origin: "PURCHASE",
          expiresAt: accessWindow.expiresAt,
          notes: "Acesso liberado pelo pagamento do pedido " + order.id,
        })
      }
      continue
    }

    if (item.courseId) {
      await grantAccess({
        userId: order.userId,
        courseId: item.courseId,
        accessType: "LIFETIME",
        origin: "PURCHASE",
        notes: "Acesso liberado pelo pagamento do pedido " + order.id,
      })
    }
  }
}
