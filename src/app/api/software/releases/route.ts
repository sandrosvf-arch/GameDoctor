import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { isDownloadStoragePath } from "@/lib/download-storage"

const SOURCE_KEY = "gamedoctor-software"

function authorized(request: Request) {
  const expected = process.env.SOFTWARE_RELEASE_TOKEN?.trim()
  const received = request.headers.get("x-software-release-token")?.trim()
  return Boolean(expected && received && received === expected)
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const version = String(body?.version ?? "").trim()
    const fileName = String(body?.fileName ?? "").trim()
    const storagePath = String(body?.storagePath ?? "").trim()
    const sizeBytes = Number(body?.sizeBytes)
    if (!version || !fileName || !isDownloadStoragePath(storagePath) || !storagePath.startsWith("downloads/software/") || !Number.isInteger(sizeBytes) || sizeBytes <= 0) return NextResponse.json({ error: "Dados da versão inválidos." }, { status: 400 })

    const creatorId = process.env.SOFTWARE_RELEASE_CREATED_BY_ID?.trim()
      || (await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } }))?.id
    if (!creatorId) return NextResponse.json({ error: "Nenhum administrador disponível para registrar a versão." }, { status: 500 })
    // instalador (.exe, Inno Setup) ou pacote .zip
    const mimeType = fileName.toLowerCase().endsWith(".exe") ? "application/vnd.microsoft.portable-executable" : "application/zip"
    const material = await db.downloadMaterial.upsert({
      where: { sourceKey: SOURCE_KEY },
      create: { title: `GameDoctor para Windows v${version}`, description: "Aplicativo oficial para acessar os materiais, diagramas, boardviews e softwares das aulas.", category: "Software", fileName, storagePath, mimeType, sizeBytes, type: "ARCHIVE", order: 0, status: "ACTIVE", sourceKey: SOURCE_KEY, metadata: { version, releaseNotes: String(body?.releaseNotes ?? "").trim() || null }, createdById: creatorId },
      update: { title: `GameDoctor para Windows v${version}`, fileName, storagePath, mimeType, sizeBytes, status: "ACTIVE", metadata: { version, releaseNotes: String(body?.releaseNotes ?? "").trim() || null } },
      select: { id: true, title: true, fileName: true, sizeBytes: true },
    })
    return NextResponse.json({ release: material })
  } catch (error) {
    console.error("[software/releases] Failed to register release", error)
    return NextResponse.json({ error: "Não foi possível registrar a versão. Verifique se as migrations de downloads foram aplicadas." }, { status: 500 })
  }
}
