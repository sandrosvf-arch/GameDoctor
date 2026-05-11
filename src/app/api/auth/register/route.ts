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

  // Basic validation
  if (password.length < 8) {
    return NextResponse.json(
      { error: "A senha deve ter pelo menos 8 caracteres." },
      { status: 400 }
    )
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: "Já existe uma conta com este e-mail." },
      { status: 409 }
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      authProvider: "EMAIL",
      role: "STUDENT",
      status: "ACTIVE",
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
