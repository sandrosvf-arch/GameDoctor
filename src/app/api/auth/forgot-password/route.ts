import { NextResponse } from "next/server"
import { requestPasswordReset } from "@/lib/password-reset"

const SUCCESS_MESSAGE = "Se o e-mail estiver cadastrado, você receberá as instruções em instantes."

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 })
  }

  try {
    await requestPasswordReset(email)
    return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE })
  } catch (error) {
    console.error("[forgot-password]", error)
    return NextResponse.json(
      { error: "Não foi possível enviar o e-mail agora. Tente novamente." },
      { status: 500 },
    )
  }
}
