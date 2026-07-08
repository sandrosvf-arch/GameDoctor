import { Prisma } from "@prisma/client"

export const ticketListSelect = {
  id: true,
  ticketNumber: true,
  subject: true,
  status: true,
  lastMessageAt: true,
  createdAt: true,
  updatedAt: true,
  department: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  student: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
  _count: {
    select: {
      messages: true,
    },
  },
} satisfies Prisma.TicketSelect

export const ticketDetailSelect = {
  id: true,
  ticketNumber: true,
  subject: true,
  status: true,
  lastMessageAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  department: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
    },
  },
  student: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
  closedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  messages: {
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      authorType: true,
      content: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
        },
      },
      attachments: {
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
      },
    },
  },
} satisfies Prisma.TicketSelect

type TicketListResult = Prisma.TicketGetPayload<{ select: typeof ticketListSelect }>
type TicketDetailResult = Prisma.TicketGetPayload<{ select: typeof ticketDetailSelect }>

export function mapTicketSummary(ticket: TicketListResult) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    status: ticket.status,
    lastMessageAt: ticket.lastMessageAt.toISOString(),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    department: ticket.department,
    student: ticket.student,
    messageCount: ticket._count.messages,
  }
}

export function mapTicketDetail(ticket: TicketDetailResult) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    status: ticket.status,
    lastMessageAt: ticket.lastMessageAt.toISOString(),
    closedAt: ticket.closedAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    department: ticket.department,
    student: ticket.student,
    closedBy: ticket.closedBy,
    messages: ticket.messages.map((message) => ({
      id: message.id,
      authorType: message.authorType,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      author: message.author,
      attachments: message.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        createdAt: attachment.createdAt.toISOString(),
      })),
    })),
  }
}
