import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSoftwareBearer } from "@/lib/software-auth"
import { hasActivePlanAccess } from "@/lib/access"

function isValidCpf(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.length !== 11 || /^([0-9])\1+$/.test(digits)) return false
  for (const length of [9, 10]) {
    const sum = digits.slice(0, length).split("").reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0)
    const check = (sum * 10) % 11 % 10
    if (check !== Number(digits[length])) return false
  }
  return true
}

export async function POST(request: Request) {
  const token = getSoftwareBearer(request)
  if (!token) return NextResponse.json({ error: "Sessão do software inválida ou expirada." }, { status: 401 })
  const user = await db.user.findUnique({ where: { id: token.userId }, select: { role: true } })
  if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR" && !await hasActivePlanAccess(token.userId))) {
    return NextResponse.json({ error: "É necessário ter um plano ativo." }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as { cpf?: unknown } | null
  const cpf = String(body?.cpf ?? "").replace(/\D/g, "")
  if (!isValidCpf(cpf)) return NextResponse.json({ error: "CPF inválido." }, { status: 400 })

  await db.user.update({ where: { id: token.userId }, data: { cpf } })
  return NextResponse.json({ ok: true, cpf })
}
