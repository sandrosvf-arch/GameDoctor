import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSoftwareBearer } from "@/lib/software-auth"
import { getDownloadStorageAdmin } from "@/lib/download-storage"
import { hasActivePlanAccess } from "@/lib/access"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getSoftwareBearer(request)
  if (!token) return NextResponse.json({ error: "Sessão do software inválida ou expirada." }, { status: 401 })

  const user = await db.user.findUnique({ where: { id: token.userId }, select: { role: true } })
  if (!user) return NextResponse.json({ error: "Conta não encontrada." }, { status: 401 })
  if (user.role !== "ADMIN" && user.role !== "EDITOR" && !await hasActivePlanAccess(token.userId)) {
    return NextResponse.json({ error: "É necessário ter um plano ativo." }, { status: 403 })
  }

  const { id } = await params
  const material = await db.downloadMaterial.findFirst({
    where: { id, status: "ACTIVE" },
    select: { storagePath: true },
  })
  if (!material) return NextResponse.json({ error: "Material não encontrado." }, { status: 404 })

  const { client, bucket } = getDownloadStorageAdmin()
  const { data, error } = await client.storage.from(bucket).createSignedUrl(material.storagePath, 60)
  if (error || !data?.signedUrl) {
    console.error("[software] Signed URL failed", error)
    return NextResponse.json({ error: "Não foi possível preparar o download." }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl, { status: 307, headers: { "Cache-Control": "private, no-store" } })
}
