import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      cpf: true,
      authProvider: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const name = String(body.name ?? "").trim()
  const email = String(body.email ?? "").trim().toLowerCase()
  const phone = String(body.phone ?? "").trim()
  const cpf = String(body.cpf ?? "").trim()
  const password = String(body.password ?? "").trim()
  const confirmPassword = String(body.confirmPassword ?? "").trim()

  if (!name || !email) {
    return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 })
  }

  if (password || confirmPassword) {
    if (password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 })
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "A confirmação de senha não confere." }, { status: 400 })
    }
  }

  const emailOwner = await db.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (emailOwner && emailOwner.id !== session.user.id) {
    return NextResponse.json({ error: "Já existe outra conta com este e-mail." }, { status: 409 })
  }

  const data: {
    name: string
    email: string
    phone: string | null
    cpf: string | null
    passwordHash?: string
    authProvider?: "EMAIL"
  } = {
    name,
    email,
    phone: phone || null,
    cpf: cpf || null,
  }

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 12)
    data.authProvider = "EMAIL"
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      cpf: true,
      authProvider: true,
    },
  })

  return NextResponse.json({ ok: true, user })
}
