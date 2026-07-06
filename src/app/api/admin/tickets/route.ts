import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { mapTicketSummary, ticketListSelect } from "@/lib/ticket-data"

async function requireStaff() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function GET(request: NextRequest) {
  const session = await requireStaff()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1)
  const pageSize = Math.min(30, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? "12") || 12))
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  const status = request.nextUrl.searchParams.get("status")?.trim() ?? "all"
  const departmentId = request.nextUrl.searchParams.get("departmentId")?.trim() ?? "all"

  const where = {
    ...(status !== "all" ? { status: status as never } : {}),
    ...(departmentId !== "all" ? { departmentId } : {}),
    ...(q
      ? {
          OR: [
            { ticketNumber: { contains: q, mode: "insensitive" as const } },
            { subject: { contains: q, mode: "insensitive" as const } },
            { student: { name: { contains: q, mode: "insensitive" as const } } },
            { student: { email: { contains: q, mode: "insensitive" as const } } },
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
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        status: true,
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
