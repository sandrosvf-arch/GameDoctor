import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { getAppBaseUrl } from "@/lib/checkout"
import { sendLiveCheckoutAccessEmail } from "@/lib/email"
import { createPasswordSetupUrl } from "@/lib/password-reset"
import { grantOrderAccess } from "@/lib/payment/grant-order-access"

type DatabaseClient = typeof db | Prisma.TransactionClient
const PASSWORD_SETUP_DURATION_MS = 24 * 60 * 60 * 1000
const EMAIL_RESEND_COOLDOWN_MS = 60 * 1000

export async function grantApprovedOrderAccess(orderId: string, client: DatabaseClient = db) {
  const order = await client.order.findUnique({
    where: { id: orderId },
    select: { checkoutChannel: true },
  })
  if (!order) return false

  if (order.checkoutChannel !== "LIVE") {
    await grantOrderAccess(orderId, client)
    return true
  }

  const claimed = await client.order.updateMany({
    where: { id: orderId, checkoutChannel: "LIVE", accessGrantedAt: null },
    data: { accessGrantedAt: new Date() },
  })
  if (claimed.count === 0) return false

  await grantOrderAccess(orderId, client)
  return true
}

export async function sendLiveCheckoutAccessIfNeeded(orderId: string, force = false) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      checkoutChannel: true,
      paymentStatus: true,
      accessGrantedAt: true,
      accessEmailSentAt: true,
      user: { select: { id: true, name: true, email: true, passwordHash: true } },
      orderItems: {
        take: 1,
        select: { plan: { select: { name: true } } },
      },
    },
  })

  if (!order || order.checkoutChannel !== "LIVE" || order.paymentStatus !== "APPROVED" || !order.accessGrantedAt) {
    return { sent: false, reason: "not_approved" as const }
  }
  if (!force && order.accessEmailSentAt) return { sent: false, reason: "already_sent" as const }
  if (force && order.accessEmailSentAt && Date.now() - order.accessEmailSentAt.getTime() < EMAIL_RESEND_COOLDOWN_MS) {
    return { sent: false, reason: "cooldown" as const }
  }

  const needsPassword = !order.user.passwordHash
  const accessUrl = needsPassword
    ? await createPasswordSetupUrl(order.user.id, PASSWORD_SETUP_DURATION_MS)
    : `${getAppBaseUrl()}/login`

  await sendLiveCheckoutAccessEmail({
    email: order.user.email,
    name: order.user.name,
    planName: order.orderItems[0]?.plan?.name ?? "Plano GameDoctor",
    accessUrl,
    needsPassword,
  })
  await db.order.update({ where: { id: order.id }, data: { accessEmailSentAt: new Date() } })
  return { sent: true, reason: "sent" as const }
}
