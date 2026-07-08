import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { mapTicketDetail, ticketDetailSelect } from "@/lib/ticket-data"

async function requireStaff() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireStaff()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const ticket = await db.ticket.findUnique({
    where: { id },
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
  const session = await requireStaff()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = typeof body?.action === "string" ? body.action : ""

  const ticket = await db.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      ticketNumber: true,
    },
  })

  if (!ticket) {
    return NextResponse.json({ error: "Ticket nao encontrado." }, { status: 404 })
  }

  if (action !== "finalize") {
    return NextResponse.json({ error: "Acao invalida." }, { status: 400 })
  }

  if (ticket.status !== "FINALIZADO") {
    await db.ticket.update({
      where: { id },
      data: {
        status: "FINALIZADO",
        closedAt: new Date(),
        closedById: session.user.id,
      },
    })

    await db.adminLog.create({
      data: {
        adminUserId: session.user.id,
        action: "TICKET_FINALIZE",
        entityType: "TICKET",
        entityId: id,
        description: `Ticket ${ticket.ticketNumber} finalizado`,
      },
    })
  }

  return NextResponse.json({ ok: true })
}
