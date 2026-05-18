import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

function buildInviteUrl(email: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const params = new URLSearchParams({ invite: "admin", email })
  return `${base}/cadastro?${params.toString()}`
}

async function requireAdminOrEditor() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return null
  }
  return session
}

async function requireAdminOnly() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return null
  }
  return session
}

export async function GET() {
  const session = await requireAdminOrEditor()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admins = await db.user.findMany({
    where: { role: { in: ["ADMIN", "EDITOR"] } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      passwordHash: true,
    },
  })

  return NextResponse.json({
    admins: admins.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      invitedPending: user.status === "PENDING" || !user.passwordHash,
      inviteUrl: user.status === "PENDING" || !user.passwordHash ? buildInviteUrl(user.email) : null,
    })),
  })
}

export async function POST(request: Request) {
  const session = await requireAdminOnly()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const email = String(body?.email ?? "").trim().toLowerCase()
  const role = body?.role === "EDITOR" ? "EDITOR" : "ADMIN"

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
  }

  if (session.user.email && session.user.email.toLowerCase() === email) {
    return NextResponse.json({ error: "Você já é administrador com este e-mail." }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email } })

  if (existing) {
    if (existing.role === "ADMIN" || existing.role === "EDITOR") {
      const inviteUrl = buildInviteUrl(existing.email)
      return NextResponse.json(
        {
          error: "Este e-mail já faz parte da equipe administrativa.",
          inviteUrl: existing.status === "PENDING" || !existing.passwordHash ? inviteUrl : null,
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Já existe uma conta com este e-mail. Remova ou altere antes de promover para admin." },
      { status: 409 }
    )
  }

  const fallbackName = email.split("@")[0].replace(/[._-]+/g, " ").trim() || "Novo Admin"

  const created = await db.user.create({
    data: {
      name: fallbackName,
      email,
      role,
      status: "PENDING",
      authProvider: "EMAIL",
      passwordHash: null,
    },
    select: { id: true, email: true, role: true },
  })

  const inviteUrl = buildInviteUrl(created.email)

  await db.adminLog.create({
    data: {
      adminUserId: session.user.id,
      action: "ADMIN_INVITE",
      entityType: "USER",
      entityId: created.id,
      description: `Convite enviado para ${created.email} como ${created.role}`,
    },
  })

  return NextResponse.json({ ok: true, inviteUrl }, { status: 201 })
}
