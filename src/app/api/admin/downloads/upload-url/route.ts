import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  createDownloadStoragePath,
  getDownloadStorageAdmin,
  MAX_DOWNLOAD_BYTES,
} from "@/lib/download-storage"

async function requireStaff() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function POST(request: Request) {
  if (!await requireStaff()) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as {
    fileName?: unknown
    mimeType?: unknown
    sizeBytes?: unknown
    category?: unknown
  } | null

  const fileName = String(body?.fileName ?? "").trim()
  const mimeType = String(body?.mimeType ?? "application/octet-stream").trim() || "application/octet-stream"
  const sizeBytes = Number(body?.sizeBytes)
  const category = String(body?.category ?? "").trim() || null

  if (!fileName) {
    return NextResponse.json({ error: "Selecione um arquivo." }, { status: 400 })
  }

  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_DOWNLOAD_BYTES) {
    return NextResponse.json({ error: "O arquivo deve ter no máximo 250 MB." }, { status: 400 })
  }

  try {
    const { client, bucket } = getDownloadStorageAdmin()
    const path = createDownloadStoragePath(category, fileName)
    const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path)

    if (error || !data) {
      console.error("[admin/downloads/upload-url] Supabase error", error)
      return NextResponse.json({ error: "Não foi possível preparar o upload." }, { status: 500 })
    }

    return NextResponse.json({
      path,
      signedUrl: data.signedUrl,
      fileName,
      mimeType,
      sizeBytes,
    })
  } catch (error) {
    console.error("[admin/downloads/upload-url] Unexpected error", error)
    return NextResponse.json({ error: "Não foi possível preparar o upload." }, { status: 500 })
  }
}