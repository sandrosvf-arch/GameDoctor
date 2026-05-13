/**
 * POST /api/admin/trilhas/reorder
 * Body: [{ id: string, displayOrder: number }, ...]
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const items = await request.json().catch(() => []) as { id: string; displayOrder: number }[]
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 })
  }

  await db.$transaction(
    items.map(({ id, displayOrder }) =>
      db.course.update({ where: { id }, data: { displayOrder } })
    )
  )

  return NextResponse.json({ ok: true })
}
