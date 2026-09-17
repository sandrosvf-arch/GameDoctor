import { NextResponse } from "next/server"
import { after } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sanitizeNotificationBody } from "@/lib/notifications"
import { processNotificationBroadcast } from "@/lib/notification-broadcast"

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
  const users = await db.user.findMany({ where: { status: "ACTIVE" }, select: { id: true } })
  const broadcast = await db.notificationBroadcast.create({
    data: {
      createdById: session.user.id,
      title,
      body,
      kind: "LINK",
      href,
      recipientCount: users.length,
      notifications: { create: users.map((user) => ({ userId: user.id, title, body, kind: "LINK", href })) },
    },
  })
  after(() => processNotificationBroadcast(broadcast.id))
  await db.adminLog.create({ data: { adminUserId: session.user.id, action: "LESSON_NOTIFICATION_BROADCAST", entityType: "NOTIFICATION_BROADCAST", entityId: broadcast.id, description: `Aviso da aula enfileirado para ${users.length} usuários.` } })
  return NextResponse.json({ id: broadcast.id, sent: users.length, status: "QUEUED" }, { status: 202 })
}
