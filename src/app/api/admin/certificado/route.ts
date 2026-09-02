import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { auth } from "@/lib/auth"
import { CERTIFICATE_TEMPLATE_KEY, APP_SETTINGS_CACHE_TAG, upsertAppSettings } from "@/lib/app-settings"
import { getCertificateTemplate, parseCertificateTemplate } from "@/lib/certificate"

const revalidateTagWithProfile = revalidateTag as unknown as (tag: string, profile: string) => void

function isStaff(role?: string) {
  return role === "ADMIN" || role === "EDITOR"
}

export async function GET() {
  const session = await auth()
  if (!session?.user || !isStaff(session.user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  return NextResponse.json({ template: await getCertificateTemplate() })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user || !isStaff(session.user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  const body = await request.json().catch(() => null) as { template?: unknown } | null
  if (!body?.template || typeof body.template !== "object") return NextResponse.json({ error: "INVALID_TEMPLATE" }, { status: 400 })
  const template = parseCertificateTemplate(JSON.stringify(body.template))
  await upsertAppSettings([{ key: CERTIFICATE_TEMPLATE_KEY, value: JSON.stringify(template) }])
  revalidateTagWithProfile(APP_SETTINGS_CACHE_TAG, "max")
  return NextResponse.json({ template })
}
