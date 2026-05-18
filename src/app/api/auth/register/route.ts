import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body?.name || !body?.email || !body?.password) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 })
  }

  const { name, email, password } = body as {
    name: string
    email: string
    password: string
  }
  const normalizedEmail = email.trim().toLowerCase()

  // Basic validation
  if (password.length < 8) {
    return NextResponse.json(
      { error: "A senha deve ter pelo menos 8 caracteres." },
      { status: 400 }
    )
  }

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    const isPendingAdminInvite =
      (existing.role === "ADMIN" || existing.role === "EDITOR") &&
      existing.status === "PENDING" &&
      !existing.passwordHash

    if (!isPendingAdminInvite) {
      return NextResponse.json(
        { error: "Já existe uma conta com este e-mail." },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await db.user.update({
      where: { id: existing.id },
      data: {
        name,
        passwordHash,
        authProvider: "EMAIL",
        status: "ACTIVE",
      },
    })

    return NextResponse.json({ ok: true, invited: true }, { status: 200 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      authProvider: "EMAIL",
      role: "STUDENT",
      status: "ACTIVE",
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
