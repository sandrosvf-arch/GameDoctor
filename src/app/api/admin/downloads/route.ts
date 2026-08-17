import { NextResponse } from "next/server"
import type { EntityStatus, MaterialType, Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { isDownloadStoragePath } from "@/lib/download-storage"

async function requireStaff() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

const materialTypes: MaterialType[] = ["PDF", "SPREADSHEET", "IMAGE", "LINK", "CHECKLIST", "ARCHIVE", "OTHER"]
const statuses: EntityStatus[] = ["ACTIVE", "INACTIVE"]

function normalizePayload(body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim()
  const description = String(body.description ?? "").trim() || null
  const category = String(body.category ?? "").trim() || null
  const fileName = String(body.fileName ?? "").trim()
  const storagePath = String(body.storagePath ?? "").trim()
  const mimeType = String(body.mimeType ?? "application/octet-stream").trim() || "application/octet-stream"
  const sizeBytes = Number(body.sizeBytes)
  const type = materialTypes.includes(String(body.type) as MaterialType)
    ? String(body.type) as MaterialType
    : "OTHER"
  const order = Number.parseInt(String(body.order ?? "0"), 10)
  const status = statuses.includes(String(body.status) as EntityStatus)
    ? String(body.status) as EntityStatus
    : "ACTIVE"

  if (!title) return { error: "Informe o título do material." }
  if (!fileName || !isDownloadStoragePath(storagePath)) return { error: "Arquivo inválido." }
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) return { error: "Tamanho de arquivo inválido." }

  return {
    data: {
      title,
      description,
      category,
      fileName,
      storagePath,
      mimeType,
      sizeBytes,
      type,
      order: Number.isFinite(order) ? order : 0,
      status,
    } satisfies Omit<Prisma.DownloadMaterialUncheckedCreateInput, "createdById">,
  }
}

function serialize(material: {
  id: string
  title: string
  description: string | null
  category: string | null
  fileName: string
  mimeType: string
  sizeBytes: number
  type: MaterialType
  order: number
  status: EntityStatus
  createdAt: Date
  updatedAt: Date
}) {
  return { ...material, createdAt: material.createdAt.toISOString(), updatedAt: material.updatedAt.toISOString() }
}

export async function GET(request: Request) {
  if (!await requireStaff()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const params = new URL(request.url).searchParams
  const search = params.get("search")?.trim() ?? ""
  const status = params.get("status")
  const where: Prisma.DownloadMaterialWhereInput = {
    ...(status === "ACTIVE" || status === "INACTIVE" ? { status } : {}),
    ...(search ? {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { fileName: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ],
    } : {}),
  }

  const materials = await db.downloadMaterial.findMany({
    where,
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
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

  return NextResponse.json({ materials: materials.map(serialize) })
}

export async function POST(request: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const payload = normalizePayload(body)
  if ("error" in payload) return NextResponse.json({ error: payload.error }, { status: 400 })

  const material = await db.downloadMaterial.create({
    data: { ...payload.data, createdById: session.user.id },
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

  return NextResponse.json({ material: serialize(material) }, { status: 201 })
}