import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { nextTicketStatusOnReply } from "@/lib/tickets"

async function requireStudent() {
  const session = await auth()
  if (!session?.user?.id) return null
  return session
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireStudent()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const content = typeof body?.content === "string" ? body.content.trim() : ""
  const attachments = normalizeAttachments(body?.attachments)

  if (content.length < 3) {
    return NextResponse.json({ error: "Escreva uma resposta com pelo menos 3 caracteres." }, { status: 400 })
  }

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

  if (ticket.status === "FINALIZADO") {
    return NextResponse.json({ error: "Esse ticket ja foi finalizado." }, { status: 400 })
  }

  const now = new Date()

  await db.$transaction(async (tx) => {
    const message = await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
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

    await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: nextTicketStatusOnReply({
          currentStatus: ticket.status,
          authorType: "STUDENT",
        }),
        lastMessageAt: now,
      },
    })
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
