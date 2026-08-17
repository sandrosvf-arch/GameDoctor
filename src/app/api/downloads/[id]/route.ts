import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getDownloadStorageAdmin } from "@/lib/download-storage"
import { hasActivePlanAccess } from "@/lib/access"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Entre na sua conta para baixar este material." }, { status: 401 })
  }

  const isStaff = session.user.role === "ADMIN" || session.user.role === "EDITOR"
  if (!isStaff && !await hasActivePlanAccess(session.user.id)) {
    return NextResponse.json({ error: "Assine um plano para acessar os materiais." }, { status: 403 })
  }

  const { id } = await params
  const material = await db.downloadMaterial.findFirst({
    where: { id, status: "ACTIVE" },
    select: { storagePath: true },
  })
  if (!material) return NextResponse.json({ error: "Material não encontrado." }, { status: 404 })

  try {
    const { client, bucket } = getDownloadStorageAdmin()
    const { data, error } = await client.storage.from(bucket).createSignedUrl(material.storagePath, 60)
    if (error || !data?.signedUrl) {
      console.error("[downloads] Signed URL failed", error)
      return NextResponse.json({ error: "Não foi possível preparar o download." }, { status: 500 })
    }

    return NextResponse.redirect(data.signedUrl, {
      status: 307,
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    console.error("[downloads] Signed URL failed", error)
    return NextResponse.json({ error: "Não foi possível preparar o download." }, { status: 500 })
  }
}