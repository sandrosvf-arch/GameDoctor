import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdmin() {
  const session = await auth()
  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")
  ) {
    return null
  }
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const banners = await db.heroBanner.findMany({
    orderBy: { order: "asc" },
  })
  return NextResponse.json(banners)
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const data = await req.json()
  const banner = await db.heroBanner.create({ data })
  return NextResponse.json(banner, { status: 201 })
}

export async function PATCH(req: Request) {
  const session = await requireAdmin()
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, ...data } = await req.json()
  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 })

  const banner = await db.heroBanner.update({ where: { id }, data })
  return NextResponse.json(banner)
}

export async function DELETE(req: Request) {
  const session = await requireAdmin()
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 })

  await db.heroBanner.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
