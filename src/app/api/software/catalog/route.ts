import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSoftwareBearer } from "@/lib/software-auth"
import { getSoftwareDownloadAvailability } from "@/lib/access"

// Categoria pela EXTENSÃO do arquivo (o tipo do banco só conhece PDF/IMAGE/ARCHIVE).
// documento/imagem/boardview abrem dentro do app; o resto vai para o disco do aluno.
const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "bmp", "gif"])
const BOARDVIEW_EXT = new Set(["pcb", "bvr", "cad", "brd", "bdv", "xzz", "fz", "tvw"])
function mapCategory(type: string, fileName: string) {
  const ext = (fileName.split(".").pop() || "").toLowerCase()
  if (ext === "pdf" || type === "PDF") return "documento"
  if (IMAGE_EXT.has(ext) || type === "IMAGE") return "imagem"
  if (BOARDVIEW_EXT.has(ext)) return "boardview"
  return "software"
}

export async function GET(request: Request) {
  const token = getSoftwareBearer(request)
  if (!token) return NextResponse.json({ error: "Sessão do software inválida ou expirada." }, { status: 401 })

  const user = await db.user.findUnique({ where: { id: token.userId }, select: { role: true } })
  if (!user) return NextResponse.json({ error: "Conta não encontrada." }, { status: 401 })
  const isStaff = user.role === "ADMIN" || user.role === "EDITOR"
  const downloadAccess = isStaff
    ? { hasPlan: true, available: true, availableAt: null as Date | null }
    : await getSoftwareDownloadAvailability(token.userId)
  if (!isStaff && !downloadAccess.hasPlan) {
    return NextResponse.json({ error: "É necessário ter um plano ativo." }, { status: 403 })
  }

  const materials = await db.downloadMaterial.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ order: "asc" }, { category: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      fileName: true,
      storagePath: true,
      mimeType: true,
      sizeBytes: true,
      type: true,
      order: true,
      createdAt: true,
      updatedAt: true,
      metadata: true,
    },
  })

  return NextResponse.json({
    downloadAvailable: downloadAccess.available,
    downloadAvailableAt: downloadAccess.availableAt?.toISOString() ?? null,
    items: materials.map((material) => ({
      id: material.id,
      nome: material.title,
      arquivo: material.fileName,
      categoria: mapCategory(material.type, material.fileName),
      marca: typeof material.metadata === "object" && material.metadata && "marca" in material.metadata ? String(material.metadata.marca) : "GameDoctor",
      console: typeof material.metadata === "object" && material.metadata && "console" in material.metadata ? String(material.metadata.console) : "Geral",
      pasta: typeof material.metadata === "object" && material.metadata && "pasta" in material.metadata ? String(material.metadata.pasta) : "",
      descricao: material.description || "",
      tamanho: material.sizeBytes,
      versao: material.updatedAt.getTime(),
      sha256: "",
      aplicar_marca: true,
      extrair: typeof material.metadata === "object" && material.metadata && "extrair" in material.metadata
        ? Boolean(material.metadata.extrair)
        : material.fileName.toLowerCase().endsWith(".zip"),
      criado_em: material.createdAt.toISOString(),
      atualizado_em: material.updatedAt.toISOString(),
      storage_path: material.storagePath,
      download_available: downloadAccess.available,
      download_available_at: downloadAccess.availableAt?.toISOString() ?? null,
    })),
  })
}
