import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSoftwareBearer } from "@/lib/software-auth"
import { createDownloadStoragePath, getDownloadStorageAdmin, isDownloadStoragePath } from "@/lib/download-storage"

const MAX_IMPORT_FILE_BYTES = 1_900_000_000

export async function POST(request: Request) {
  const token = getSoftwareBearer(request)
  if (!token) return NextResponse.json({ error: "Sessão do software inválida ou expirada." }, { status: 401 })
  const user = await db.user.findUnique({ where: { id: token.userId }, select: { id: true, role: true } })
  if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) {
    return NextResponse.json({ error: "Apenas administradores podem importar materiais." }, { status: 403 })
  }
  const body = await request.json().catch(() => null) as { fileName?: unknown; mimeType?: unknown; sizeBytes?: unknown; category?: unknown; sourceKey?: unknown } | null
  const fileName = String(body?.fileName ?? "").trim()
  const mimeType = String(body?.mimeType ?? "application/octet-stream").trim() || "application/octet-stream"
  const sizeBytes = Number(body?.sizeBytes)
  const category = String(body?.category ?? "geral").trim() || "geral"
  const sourceKey = String(body?.sourceKey ?? "").trim() || null
  if (!fileName || !Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_IMPORT_FILE_BYTES) {
    return NextResponse.json({ error: "Arquivo inválido ou maior que o limite de 1,9 GB." }, { status: 400 })
  }

  if (sourceKey) {
    const existing = await db.downloadMaterial.findUnique({ where: { sourceKey }, select: { id: true } })
    if (existing) return NextResponse.json({ skipped: true, materialId: existing.id, sourceKey })
  }

  try {
    const { client, bucket } = getDownloadStorageAdmin()
    const path = createDownloadStoragePath(category, fileName)
    if (!isDownloadStoragePath(path)) return NextResponse.json({ error: "Caminho inválido." }, { status: 400 })
    const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path)
    if (error || !data) return NextResponse.json({ error: "Não foi possível preparar o upload." }, { status: 500 })
    return NextResponse.json({ path, signedUrl: data.signedUrl, fileName, mimeType, sizeBytes })
  } catch (error) {
    console.error("[software/admin/upload-url]", error)
    return NextResponse.json({ error: "Não foi possível preparar o upload." }, { status: 500 })
  }
}
