import { after, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { processNotificationBroadcast } from "@/lib/notification-broadcast"
import { sanitizeNotificationBody } from "@/lib/notifications"

const TEST_EMAIL = "thiago_salests@hotmail.com"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params
  const [lesson, user] = await Promise.all([
    db.lesson.findUnique({ where: { id }, select: { id: true, title: true, description: true, status: true, course: { select: { title: true } } } }),
    db.user.findUnique({ where: { email: TEST_EMAIL }, select: { id: true, name: true, email: true } }),
  ])
  if (!lesson) return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 })
  if (lesson.status !== "PUBLISHED") return NextResponse.json({ error: "Publique a aula antes de enviar o teste." }, { status: 400 })
  if (!user) return NextResponse.json({ error: `Não existe usuário cadastrado para ${TEST_EMAIL}.` }, { status: 404 })

  const title = `[TESTE] Nova aula: ${lesson.title}`
  const body = sanitizeNotificationBody(lesson.description?.trim() || `Teste de aviso para a aula publicada em ${lesson.course.title}.`, false)
  const href = `/aula/${lesson.id}`
  const broadcast = await db.notificationBroadcast.create({
    data: {
      createdById: session.user.id,
      title,
      body,
      kind: "LINK",
      href,
      recipientCount: 1,
      notifications: { create: { userId: user.id, title, body, kind: "LINK", href } },
    },
  })
  after(() => processNotificationBroadcast(broadcast.id))
  await db.adminLog.create({ data: { adminUserId: session.user.id, action: "LESSON_NOTIFICATION_TEST", entityType: "NOTIFICATION_BROADCAST", entityId: broadcast.id, description: `Teste de aviso da aula enviado para ${TEST_EMAIL}.` } })
  return NextResponse.json({ id: broadcast.id, email: TEST_EMAIL, status: "QUEUED" }, { status: 202 })
}
