import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sendNotificationEmail } from "@/lib/email"
import { sanitizeNotificationBody } from "@/lib/notifications"

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
  const users = await db.user.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, email: true } })
  const created = await db.userNotification.createManyAndReturn({
    data: users.map((user) => ({
      userId: user.id,
      title: parsed.data.title,
      body,
      kind: parsed.data.kind,
      href: parsed.data.href || null,
    })),
    select: { id: true, userId: true },
  })

  let emailed = 0
  if (parsed.data.sendEmail) {
    for (const user of users) {
      try {
        await sendNotificationEmail({ email: user.email, name: user.name, title: parsed.data.title, body, href: parsed.data.href })
        const notification = created.find((item) => item.userId === user.id)
        if (notification) await db.userNotification.update({ where: { id: notification.id }, data: { emailSentAt: new Date() } })
        emailed++
      } catch {
        // A delivery failure must not discard the internal notification.
      }
    }
  }

  await db.adminLog.create({ data: { adminUserId: session.user.id, action: "NOTIFICATION_BROADCAST", entityType: "USER_NOTIFICATION", entityId: created[0]?.id ?? "broadcast", description: `Aviso enviado para ${users.length} usuários; ${emailed} e-mails enviados.` } })
  return NextResponse.json({ created: users.length, emailed })
}
