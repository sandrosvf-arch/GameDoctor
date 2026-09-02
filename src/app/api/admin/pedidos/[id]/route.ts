import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireStaff() {
  const session = await auth()
  return session?.user && (session.user.role === "ADMIN" || session.user.role === "EDITOR") ? session : null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => null) as { action?: string } | null
  if (body?.action !== "archive" && body?.action !== "restore") return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  const order = await db.order.update({
    where: { id },
    data: { archivedAt: body.action === "archive" ? new Date() : null },
    select: { id: true, archivedAt: true },
  })
  return NextResponse.json({ order: { id: order.id, archivedAt: order.archivedAt?.toISOString() ?? null } })
}
