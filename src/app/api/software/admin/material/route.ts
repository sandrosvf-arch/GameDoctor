import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { isDownloadStoragePath } from "@/lib/download-storage"
import type { MaterialType } from "@prisma/client"
import { getSoftwareBearer } from "@/lib/software-auth"

export async function POST(request: Request) {
  const token = getSoftwareBearer(request)
  if (!token) return NextResponse.json({ error: "Sessão do software inválida ou expirada." }, { status: 401 })
  const user = await db.user.findUnique({ where: { id: token.userId }, select: { id: true, role: true } })
  if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) {
    return NextResponse.json({ error: "Apenas administradores podem importar materiais." }, { status: 403 })
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const title = String(body?.title ?? "").trim()
  const fileName = String(body?.fileName ?? "").trim()
  const storagePath = String(body?.storagePath ?? "").trim()
  const sizeBytes = Number(body?.sizeBytes)
  const sourceKey = String(body?.sourceKey ?? "").trim() || null
  const materialType = ["PDF", "SPREADSHEET", "IMAGE", "LINK", "CHECKLIST", "ARCHIVE", "OTHER"].includes(String(body?.type))
    ? String(body?.type) as MaterialType
    : "OTHER" as MaterialType
  if (!title || !fileName || !isDownloadStoragePath(storagePath) || !Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json({ error: "Dados do material inválidos." }, { status: 400 })
  }

  if (sourceKey) {
    const existing = await db.downloadMaterial.findUnique({ where: { sourceKey }, select: { id: true } })
    if (existing) return NextResponse.json({ material: existing, skipped: true })
  }

  const material = await db.downloadMaterial.create({
    data: {
      title,
      description: String(body?.description ?? "").trim() || null,
      category: String(body?.category ?? "geral").trim() || "geral",
      fileName,
      storagePath,
      mimeType: String(body?.mimeType ?? "application/octet-stream"),
      sizeBytes,
      type: materialType,
      order: Number.isInteger(Number(body?.order)) ? Number(body?.order) : 0,
      metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
      sourceKey,
      createdById: user.id,
    },
    select: { id: true },
  })
  return NextResponse.json({ material }, { status: 201 })
}
