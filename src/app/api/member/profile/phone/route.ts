import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "É necessário estar logado." }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const phone = typeof body?.phone === "string" ? body.phone.trim() : ""
  const digits = phone.replace(/\D/g, "")

  if (digits.length < 10 || digits.length > 15) {
    return NextResponse.json({ error: "Informe um telefone válido com DDD." }, { status: 400 })
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: { phone },
    select: { phone: true },
  })

  return NextResponse.json({ ok: true, phone: user.phone })
}