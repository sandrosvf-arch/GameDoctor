import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdminOnly() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return null
  }
  return session
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminOnly()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => null)

  const action = String(body?.action ?? "")

  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })

  if (target.id === session.user.id && action === "revoke") {
    return NextResponse.json({ error: "Você não pode remover seu próprio acesso admin." }, { status: 400 })
  }

  if (action === "set-role") {
    const role = body?.role === "EDITOR" ? "EDITOR" : "ADMIN"
    const updated = await db.user.update({
      where: { id },
      data: { role },
      select: { id: true, role: true },
    })

    await db.adminLog.create({
      data: {
        adminUserId: session.user.id,
        action: "ADMIN_ROLE_UPDATE",
        entityType: "USER",
        entityId: id,
        description: `Permissão atualizada para ${updated.role}`,
      },
    })

    return NextResponse.json({ ok: true, role: updated.role })
  }

  if (action === "toggle-status") {
    const status = target.status === "BLOCKED" ? "ACTIVE" : "BLOCKED"
    const updated = await db.user.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    })

    await db.adminLog.create({
      data: {
        adminUserId: session.user.id,
        action: "ADMIN_STATUS_UPDATE",
        entityType: "USER",
        entityId: id,
        description: `Status alterado para ${updated.status}`,
      },
    })

    return NextResponse.json({ ok: true, status: updated.status })
  }

  if (action === "revoke") {
    const updated = await db.user.update({
      where: { id },
      data: {
        role: "STUDENT",
        status: "ACTIVE",
      },
      select: { id: true },
    })

    await db.adminLog.create({
      data: {
        adminUserId: session.user.id,
        action: "ADMIN_REVOKE",
        entityType: "USER",
        entityId: updated.id,
        description: `Acesso administrativo removido de ${target.email}`,
      },
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 })
}
