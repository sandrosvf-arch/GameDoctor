/**
 * DELETE /api/admin/aulas/[id]/materials/[materialId]
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { materialId } = await params

  await db.material.delete({ where: { id: materialId } })
  return NextResponse.json({ ok: true })
}
