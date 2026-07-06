import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { mapTicketDetail, ticketDetailSelect } from "@/lib/ticket-data"

async function requireStudent() {
  const session = await auth()
  if (!session?.user?.id) return null
  return session
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireStudent()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const ticket = await db.ticket.findFirst({
    where: {
      id,
      studentId: session.user.id,
    },
    select: ticketDetailSelect,
  })

  if (!ticket) {
    return NextResponse.json({ error: "Ticket nao encontrado." }, { status: 404 })
  }

  return NextResponse.json({ ticket: mapTicketDetail(ticket) })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireStudent()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = typeof body?.action === "string" ? body.action : ""

  const ticket = await db.ticket.findFirst({
    where: {
      id,
      studentId: session.user.id,
    },
    select: {
      id: true,
      status: true,
    },
  })

  if (!ticket) {
    return NextResponse.json({ error: "Ticket nao encontrado." }, { status: 404 })
  }

  if (action !== "finalize") {
    return NextResponse.json({ error: "Acao invalida." }, { status: 400 })
  }

  if (ticket.status === "FINALIZADO") {
    return NextResponse.json({ ok: true })
  }

  await db.ticket.update({
    where: { id },
    data: {
      status: "FINALIZADO",
      closedAt: new Date(),
      closedById: session.user.id,
    },
  })

  return NextResponse.json({ ok: true })
}
