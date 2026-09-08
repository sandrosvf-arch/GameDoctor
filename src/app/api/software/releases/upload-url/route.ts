import { NextResponse } from "next/server"
import { createDownloadStoragePath, getDownloadStorageAdmin, MAX_DOWNLOAD_BYTES } from "@/lib/download-storage"

function authorized(request: Request) {
  const expected = process.env.SOFTWARE_RELEASE_TOKEN?.trim()
  const received = request.headers.get("x-software-release-token")?.trim()
  return Boolean(expected && received && received === expected)
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const body = await request.json().catch(() => null) as { fileName?: unknown; sizeBytes?: unknown } | null
  const fileName = String(body?.fileName ?? "").trim()
  const sizeBytes = Number(body?.sizeBytes)
  if (!fileName || !Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_DOWNLOAD_BYTES) return NextResponse.json({ error: "Arquivo inválido ou acima do limite." }, { status: 400 })

  try {
    const { client, bucket } = getDownloadStorageAdmin()
    const path = createDownloadStoragePath("software", fileName)
    const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path)
    if (error || !data) return NextResponse.json({ error: "Não foi possível preparar o upload." }, { status: 500 })
    return NextResponse.json({ path, signedUrl: data.signedUrl })
  } catch {
    return NextResponse.json({ error: "Não foi possível preparar o upload." }, { status: 500 })
  }
}
