import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { mapTicketDetail, mapTicketSummary, ticketDetailSelect, ticketListSelect } from "@/lib/ticket-data"
import { buildTicketNumber } from "@/lib/tickets"

async function requireStudent() {
  const session = await auth()
  if (!session?.user?.id) return null
  return session
}

async function createUniqueTicketNumber() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const ticketNumber = buildTicketNumber()
    const existing = await db.ticket.findUnique({
      where: { ticketNumber },
      select: { id: true },
    })

    if (!existing) return ticketNumber
  }

  throw new Error("Nao foi possivel gerar um numero de ticket unico.")
}

function normalizeAttachments(input: unknown) {
  if (!Array.isArray(input)) return []

  return input
    .filter((attachment) => typeof (attachment as { url?: unknown })?.url === "string")
    .slice(0, 5)
    .map((attachment) => {
      const current = attachment as {
        fileName?: string
        url: string
        mimeType?: string
        sizeBytes?: number | string
      }

      return {
        fileName:
          typeof current.fileName === "string" && current.fileName.trim()
            ? current.fileName.trim()
            : "anexo",
        fileUrl: current.url.trim(),
        mimeType: typeof current.mimeType === "string" ? current.mimeType : null,
        sizeBytes:
          Number.isFinite(Number(current.sizeBytes)) && Number(current.sizeBytes) > 0
            ? Number(current.sizeBytes)
            : null,
      }
    })
}

export async function GET(request: NextRequest) {
  const session = await requireStudent()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1)
  const pageSize = Math.min(20, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? "10") || 10))
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  const status = request.nextUrl.searchParams.get("status")?.trim() ?? "all"

  const where = {
    studentId: session.user.id,
    ...(status !== "all" ? { status: status as never } : {}),
    ...(q
      ? {
          OR: [
            { ticketNumber: { contains: q, mode: "insensitive" as const } },
            { subject: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [totalItems, tickets, departments] = await Promise.all([
    db.ticket.count({ where }),
    db.ticket.findMany({
      where,
      orderBy: [{ lastMessageAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: ticketListSelect,
    }),
    db.ticketDepartment.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
      },
    }),
  ])

  return NextResponse.json({
    tickets: tickets.map(mapTicketSummary),
    departments,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      hasPreviousPage: page > 1,
      hasNextPage: page * pageSize < totalItems,
    },
  })
}

export async function POST(request: Request) {
  const session = await requireStudent()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const subject = typeof body?.subject === "string" ? body.subject.trim() : ""
  const departmentId = typeof body?.departmentId === "string" ? body.departmentId : ""
  const content = typeof body?.content === "string" ? body.content.trim() : ""
  const attachments = normalizeAttachments(body?.attachments)

  if (subject.length < 6) {
    return NextResponse.json({ error: "Informe um assunto com pelo menos 6 caracteres." }, { status: 400 })
  }

  if (content.length < 10) {
    return NextResponse.json({ error: "Descreva a solicitacao com pelo menos 10 caracteres." }, { status: 400 })
  }

  const department = await db.ticketDepartment.findFirst({
    where: {
      id: departmentId,
      status: "ACTIVE",
    },
    select: { id: true },
  })

  if (!department) {
    return NextResponse.json({ error: "Selecione um departamento valido." }, { status: 400 })
  }

  const ticketNumber = await createUniqueTicketNumber()
  const now = new Date()

  const ticket = await db.$transaction(async (tx) => {
    const createdTicket = await tx.ticket.create({
      data: {
        ticketNumber,
        studentId: session.user.id,
        departmentId: department.id,
        subject,
        status: "ABERTO",
        lastMessageAt: now,
      },
      select: { id: true },
    })

    const message = await tx.ticketMessage.create({
      data: {
        ticketId: createdTicket.id,
        authorId: session.user.id,
        authorType: "STUDENT",
        content,
      },
      select: { id: true },
    })

    if (attachments.length) {
      await tx.ticketAttachment.createMany({
        data: attachments.map((attachment) => ({
          messageId: message.id,
          uploadedById: session.user.id,
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        })),
      })
    }

    return tx.ticket.findUniqueOrThrow({
      where: { id: createdTicket.id },
      select: ticketDetailSelect,
    })
  })

  return NextResponse.json({ ticket: mapTicketDetail(ticket) }, { status: 201 })
}
