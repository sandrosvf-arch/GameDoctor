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

  const target = await db.ticketDepartment.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!target) {
    return NextResponse.json({ error: "Departamento nao encontrado." }, { status: 404 })
  }

  try {
    await db.ticketDepartment.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || null,
        order,
        status,
      },
    })

    await db.adminLog.create({
      data: {
        adminUserId: session.user.id,
        action: "TICKET_DEPARTMENT_UPDATE",
        entityType: "TICKET_DEPARTMENT",
        entityId: id,
        description: `Departamento ${target.name} atualizado`,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ja existe outro departamento com esse nome." }, { status: 409 })
    }

    return NextResponse.json({ error: "Nao foi possivel atualizar o departamento." }, { status: 400 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireStaff()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const target = await db.ticketDepartment.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!target) {
    return NextResponse.json({ error: "Departamento nao encontrado." }, { status: 404 })
  }

  const tickets = await db.ticket.count({
    where: { departmentId: id },
  })

  if (tickets > 0) {
    return NextResponse.json(
      { error: "Esse departamento ja possui tickets vinculados. Inative em vez de excluir." },
      { status: 409 }
    )
  }

  await db.ticketDepartment.delete({
    where: { id },
  })

  await db.adminLog.create({
    data: {
      adminUserId: session.user.id,
      action: "TICKET_DEPARTMENT_DELETE",
      entityType: "TICKET_DEPARTMENT",
      entityId: id,
      description: `Departamento ${target.name} removido`,
    },
  })

  return NextResponse.json({ ok: true })
}
