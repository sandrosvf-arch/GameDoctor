import { db } from "@/lib/db"
import { sendNotificationEmail } from "@/lib/email"

export async function processNotificationBroadcast(broadcastId: string) {
  const broadcast = await db.notificationBroadcast.findUnique({
    where: { id: broadcastId },
    include: { notifications: { include: { user: { select: { name: true, email: true } } } } },
  })
  if (!broadcast || !broadcast.sendEmail || broadcast.status === "COMPLETED") return

  await db.notificationBroadcast.update({ where: { id: broadcastId }, data: { status: "PROCESSING" } })
  let sent = 0
  let failed = 0
  for (const notification of broadcast.notifications) {
    try {
      const lessonTitle = broadcast.title.replace(/^\[TESTE\]\s*/i, "").match(/^Nova aula:\s*(.+)$/i)?.[1]
      await sendNotificationEmail({ email: notification.user.email, name: notification.user.name, title: broadcast.title, body: broadcast.body, href: broadcast.href, lessonTitle, isTest: /^\[TESTE\]/i.test(broadcast.title) })
      sent++
      await db.userNotification.update({ where: { id: notification.id }, data: { emailSentAt: new Date() } })
    } catch {
      failed++
    }
    await db.notificationBroadcast.update({ where: { id: broadcastId }, data: { emailSentCount: sent, emailFailedCount: failed } })
  }

  await db.notificationBroadcast.update({
    where: { id: broadcastId },
    data: { status: failed > 0 ? (sent > 0 ? "PARTIAL" : "FAILED") : "COMPLETED", completedAt: new Date() },
  })
}

export async function deleteNotificationBroadcast(id: string) {
  await db.notificationBroadcast.delete({ where: { id } })
}
