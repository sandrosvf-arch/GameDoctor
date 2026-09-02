import { NextResponse } from "next/server"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCertificateEligibility, getCertificateTemplate, newCertificateCode, renderCertificatePdf } from "@/lib/certificate"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  const eligibility = await getCertificateEligibility(session.user.id, session.user.role)
  if (!eligibility.eligible) return NextResponse.json({ error: "CERTIFICATE_NOT_AVAILABLE", ...eligibility }, { status: 403 })

  const certificate = await db.certificate.upsert({
    where: { globalKey: session.user.id },
    update: {},
    create: {
      userId: session.user.id,
      globalKey: session.user.id,
      certificateCode: newCertificateCode(),
    },
    select: { certificateCode: true, issuedAt: true },
  })
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { name: true } })
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

  const bytes = await renderCertificatePdf({
    template: await getCertificateTemplate(),
    name: user.name,
    title: "Formação GameDoctor",
    date: format(certificate.issuedAt, "dd/MM/yyyy", { locale: ptBR }),
    code: certificate.certificateCode,
  })

  return new NextResponse(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-gamedoctor-${certificate.certificateCode}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
}
