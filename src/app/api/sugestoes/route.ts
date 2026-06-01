import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, lesson } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 })
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
    }
    if (!lesson || typeof lesson !== "string" || !lesson.trim()) {
      return NextResponse.json({ error: "Informe a aula desejada." }, { status: 400 })
    }

    await db.lessonSuggestion.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone && typeof phone === "string" ? phone.trim() || null : null,
        lesson: lesson.trim(),
      },
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 })
  }
}
