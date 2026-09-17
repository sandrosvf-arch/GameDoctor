import { NextResponse } from "next/server"
import { after } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sanitizeNotificationBody } from "@/lib/notifications"
import { processNotificationBroadcast } from "@/lib/notification-broadcast"

async function requireStaff() {
  const session = await auth()
  return session && (session.user.role === "ADMIN" || session.user.role === "EDITOR") ? session : null
}

const schema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(1).max(20_000),
  kind: z.enum(["SIMPLE", "RICH_TEXT", "LINK"]),
  href: z.string().trim().url().optional().or(z.literal("")),
  sendEmail: z.boolean().default(true),
})

export async function POST(request: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Revise título, conteúdo e link." }, { status: 400 })

  const body = sanitizeNotificationBody(parsed.data.body, parsed.data.kind === "RICH_TEXT")
  if (!body) return NextResponse.json({ error: "O conteúdo não pode ficar vazio." }, { status: 400 })
  const users = await db.user.findMany({ where: { status: "ACTIVE" }, select: { id: true } })
  const broadcast = await db.notificationBroadcast.create({
    data: {
      createdById: session.user.id,
      title: parsed.data.title,
      body,
      kind: parsed.data.kind,
      href: parsed.data.href || null,
      sendEmail: parsed.data.sendEmail,
      recipientCount: users.length,
      status: parsed.data.sendEmail ? "QUEUED" : "COMPLETED",
      notifications: { create: users.map((user) => ({ userId: user.id, title: parsed.data.title, body, kind: parsed.data.kind, href: parsed.data.href || null })) },
    },
  })
  if (parsed.data.sendEmail) after(() => processNotificationBroadcast(broadcast.id))
  await db.adminLog.create({ data: { adminUserId: session.user.id, action: "NOTIFICATION_BROADCAST", entityType: "NOTIFICATION_BROADCAST", entityId: broadcast.id, description: `Aviso enfileirado para ${users.length} usuários.` } })
  return NextResponse.json({ id: broadcast.id, created: users.length, status: broadcast.status }, { status: 202 })
}

export async function GET() {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const broadcasts = await db.notificationBroadcast.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, body: true, kind: true, href: true, sendEmail: true, status: true, recipientCount: true, emailSentCount: true, emailFailedCount: true, createdAt: true, completedAt: true } })
  return NextResponse.json({ broadcasts })
}

export async function DELETE(request: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const body = await request.json().catch(() => null) as { id?: string } | null
  if (!body?.id) return NextResponse.json({ error: "Informe a notificação." }, { status: 400 })
  const broadcast = await db.notificationBroadcast.findUnique({ where: { id: body.id }, select: { id: true } })
  if (!broadcast) return NextResponse.json({ error: "Notificação não encontrada." }, { status: 404 })
  await db.notificationBroadcast.delete({ where: { id: body.id } })
  return NextResponse.json({ ok: true })
}
