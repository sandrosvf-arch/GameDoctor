import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sendNotificationEmail } from "@/lib/email"
import { sanitizeNotificationBody } from "@/lib/notifications"

async function requireStaff() {
  const session = await auth()
  return session && (session.user.role === "ADMIN" || session.user.role === "EDITOR") ? session : null
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const { id } = await params
  const lesson = await db.lesson.findUnique({
    where: { id },
    select: { id: true, title: true, description: true, status: true, newLessonNotificationSentAt: true, course: { select: { title: true } } },
  })
  if (!lesson) return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 })
  if (lesson.status !== "PUBLISHED") return NextResponse.json({ error: "Publique a aula antes de enviar o aviso." }, { status: 400 })
  if (lesson.newLessonNotificationSentAt) return NextResponse.json({ error: "O aviso desta aula já foi enviado." }, { status: 409 })

  const claimed = await db.lesson.updateMany({
    where: { id, status: "PUBLISHED", newLessonNotificationSentAt: null },
    data: { newLessonNotificationSentAt: new Date() },
  })
  if (claimed.count !== 1) return NextResponse.json({ error: "O aviso desta aula já foi enviado." }, { status: 409 })

  const title = `Nova aula: ${lesson.title}`
  const body = sanitizeNotificationBody(lesson.description?.trim() || `Uma nova aula foi publicada em ${lesson.course.title}.`, false)
  const href = `/aula/${lesson.id}`
  const users = await db.user.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, email: true } })
  const created = await db.userNotification.createManyAndReturn({
    data: users.map((user) => ({ userId: user.id, title, body, kind: "LINK" as const, href })),
    select: { id: true, userId: true },
  })

  let emailed = 0
  for (const user of users) {
    try {
      await sendNotificationEmail({ email: user.email, name: user.name, title, body, href })
      const notification = created.find((item) => item.userId === user.id)
      if (notification) await db.userNotification.update({ where: { id: notification.id }, data: { emailSentAt: new Date() } })
      emailed++
    } catch {
      // Keep the internal notification even when an SMTP delivery fails.
    }
  }

  await db.adminLog.create({ data: { adminUserId: session.user.id, action: "LESSON_NOTIFICATION_BROADCAST", entityType: "LESSON", entityId: lesson.id, description: `Aviso da aula enviado para ${users.length} usuários; ${emailed} e-mails enviados.` } })
  return NextResponse.json({ sent: users.length, emailed })
}
