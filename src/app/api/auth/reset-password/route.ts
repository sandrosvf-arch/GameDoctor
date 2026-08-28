import { NextResponse } from "next/server"
import { resetPassword } from "@/lib/password-reset"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!token) {
    return NextResponse.json({ error: "Link de recuperação inválido." }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "A senha deve ter pelo menos 8 caracteres." },
      { status: 400 },
    )
  }

  const updated = await resetPassword(token, password)
  if (!updated) {
    return NextResponse.json(
      { error: "Este link é inválido, expirou ou já foi utilizado." },
      { status: 400 },
    )
  }

  return NextResponse.json({ ok: true })
}
