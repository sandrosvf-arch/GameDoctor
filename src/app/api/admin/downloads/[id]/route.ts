import { NextResponse } from "next/server"
import type { EntityStatus, MaterialType, Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getDownloadStorageAdmin, isDownloadStoragePath } from "@/lib/download-storage"

async function requireStaff() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const data: Prisma.DownloadMaterialUpdateInput = {}
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim()
  if (typeof body.description === "string") data.description = body.description.trim() || null
  if (typeof body.category === "string") data.category = body.category.trim() || null
  if (typeof body.order === "number" && Number.isInteger(body.order)) data.order = body.order
  if (["PDF", "SPREADSHEET", "IMAGE", "LINK", "CHECKLIST", "ARCHIVE", "OTHER"].includes(String(body.type))) {
    data.type = String(body.type) as MaterialType
  }
  if (["ACTIVE", "INACTIVE"].includes(String(body.status))) data.status = String(body.status) as EntityStatus

  const updated = await db.downloadMaterial.update({
    where: { id },
    data,
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      type: true,
      order: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ material: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() } })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const { id } = await params
  const material = await db.downloadMaterial.findUnique({ where: { id }, select: { storagePath: true } })
  if (!material) return NextResponse.json({ error: "Material não encontrado." }, { status: 404 })

  if (isDownloadStoragePath(material.storagePath)) {
    try {
      const { client, bucket } = getDownloadStorageAdmin()
      const { error } = await client.storage.from(bucket).remove([material.storagePath])
      if (error) console.error("[admin/downloads] Supabase delete failed", error)
    } catch (error) {
      console.error("[admin/downloads] Supabase delete failed", error)
    }
  }

  await db.downloadMaterial.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}