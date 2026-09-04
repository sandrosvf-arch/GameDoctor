import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSoftwareBearer } from "@/lib/software-auth"
import { hasActivePlanAccess } from "@/lib/access"

function mapCategory(type: string) {
  if (type === "PDF") return "documento"
  if (type === "IMAGE") return "imagem"
  if (type === "ARCHIVE") return "software"
  return "documento"
}

export async function GET(request: Request) {
  const token = getSoftwareBearer(request)
  if (!token) return NextResponse.json({ error: "Sessão do software inválida ou expirada." }, { status: 401 })

  const user = await db.user.findUnique({ where: { id: token.userId }, select: { role: true } })
  if (!user) return NextResponse.json({ error: "Conta não encontrada." }, { status: 401 })
  if (user.role !== "ADMIN" && user.role !== "EDITOR" && !await hasActivePlanAccess(token.userId)) {
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
    items: materials.map((material) => ({
      id: material.id,
      nome: material.title,
      arquivo: material.fileName,
      categoria: mapCategory(material.type),
      marca: typeof material.metadata === "object" && material.metadata && "marca" in material.metadata ? String(material.metadata.marca) : "GameDoctor",
      console: typeof material.metadata === "object" && material.metadata && "console" in material.metadata ? String(material.metadata.console) : "Geral",
      pasta: typeof material.metadata === "object" && material.metadata && "pasta" in material.metadata ? String(material.metadata.pasta) : "",
      descricao: material.description || "",
      tamanho: material.sizeBytes,
      versao: material.updatedAt.getTime(),
      sha256: "",
      aplicar_marca: false,
      extrair: typeof material.metadata === "object" && material.metadata && "extrair" in material.metadata
        ? Boolean(material.metadata.extrair)
        : material.fileName.toLowerCase().endsWith(".zip"),
      criado_em: material.createdAt.toISOString(),
      atualizado_em: material.updatedAt.toISOString(),
      storage_path: material.storagePath,
    })),
  })
}
