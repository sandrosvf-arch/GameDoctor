import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const notifications = await db.userNotification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  const unreadCount = await db.userNotification.count({ where: { userId: session.user.id, readAt: null } })
  return NextResponse.json({ notifications, unreadCount })
}

const updateSchema = z.object({ id: z.string().optional(), all: z.boolean().optional() })

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const payload = updateSchema.safeParse(await request.json().catch(() => null))
  if (!payload.success || (!payload.data.id && !payload.data.all)) {
    return NextResponse.json({ error: "Informe a notificação ou marque todas como lidas." }, { status: 400 })
  }

  await db.userNotification.updateMany({
    where: { userId: session.user.id, ...(payload.data.id ? { id: payload.data.id } : {}), readAt: null },
    data: { readAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
