import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { slugifyTicketDepartment } from "@/lib/tickets"

async function requireStaff() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function GET() {
  const session = await requireStaff()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const departments = await db.ticketDepartment.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      order: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          tickets: true,
        },
      },
    },
  })

  return NextResponse.json({
    departments: departments.map((department) => ({
      id: department.id,
      name: department.name,
      slug: department.slug,
      description: department.description,
      order: department.order,
      status: department.status,
      createdAt: department.createdAt.toISOString(),
      ticketCount: department._count.tickets,
    })),
  })
}

export async function POST(request: Request) {
  const session = await requireStaff()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const description = typeof body?.description === "string" ? body.description.trim() : ""
  const order = Number(body?.order ?? 0) || 0
  const status = body?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"

  if (!name) {
    return NextResponse.json({ error: "Informe o nome do departamento." }, { status: 400 })
  }

  const slug = slugifyTicketDepartment(name)
  if (!slug) {
    return NextResponse.json({ error: "Nao foi possivel gerar o slug do departamento." }, { status: 400 })
  }

  try {
    const department = await db.ticketDepartment.create({
      data: {
        name,
        slug,
        description: description || null,
        order,
        status,
      },
      select: {
        id: true,
      },
    })

    await db.adminLog.create({
      data: {
        adminUserId: session.user.id,
        action: "TICKET_DEPARTMENT_CREATE",
        entityType: "TICKET_DEPARTMENT",
        entityId: department.id,
        description: `Departamento ${name} criado`,
      },
    })

    return NextResponse.json({ ok: true, id: department.id }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ja existe um departamento com esse nome." }, { status: 409 })
    }

    return NextResponse.json({ error: "Nao foi possivel criar o departamento." }, { status: 400 })
  }
}
