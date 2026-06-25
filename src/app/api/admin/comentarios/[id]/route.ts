import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = typeof body?.action === "string" ? body.action : ""

  if (action === "approve") {
    const updated = await db.comment.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
    })

    return NextResponse.json(updated)
  }

  if (action === "reject") {
    const updated = await db.comment.update({
      where: { id },
      data: {
        status: "REJECTED",
      },
    })

    return NextResponse.json(updated)
  }

  if (action === "reply") {
    const content = typeof body?.content === "string" ? body.content.trim() : ""
    if (!content) {
      return NextResponse.json({ error: "Informe a resposta." }, { status: 400 })
    }

    const parent = await db.comment.findUnique({
      where: { id },
      select: { id: true, lessonId: true },
    })

    if (!parent) {
      return NextResponse.json({ error: "Comentário não encontrado." }, { status: 404 })
    }

    const reply = await db.comment.create({
      data: {
        lessonId: parent.lessonId,
        userId: session.user.id,
        parentId: parent.id,
        content,
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
    })

    return NextResponse.json(reply, { status: 201 })
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 })
}
