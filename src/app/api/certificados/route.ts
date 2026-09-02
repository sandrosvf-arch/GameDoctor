import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCertificateEligibility } from "@/lib/certificate"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  const eligibility = await getCertificateEligibility(session.user.id, session.user.role)
  const certificate = await db.certificate.findFirst({
    where: { userId: session.user.id, globalKey: session.user.id },
    select: { certificateCode: true, issuedAt: true, status: true },
  })

  return NextResponse.json({
    ...eligibility,
    certificate: certificate ? { ...certificate, issuedAt: certificate.issuedAt.toISOString() } : null,
  })
}
