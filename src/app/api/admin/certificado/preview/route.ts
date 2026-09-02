import { NextResponse } from "next/server"
import { format } from "date-fns"
import { auth } from "@/lib/auth"
import { parseCertificateTemplate, renderCertificatePdf } from "@/lib/certificate"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !["ADMIN", "EDITOR"].includes(session.user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  const body = await request.json().catch(() => null) as { template?: unknown } | null
  if (!body?.template || typeof body.template !== "object") return NextResponse.json({ error: "INVALID_TEMPLATE" }, { status: 400 })
  const bytes = await renderCertificatePdf({
    template: parseCertificateTemplate(JSON.stringify(body.template)),
    name: session.user.name ?? "Nome do aluno",
    title: "Formação GameDoctor",
    date: format(new Date(), "dd/MM/yyyy"),
    code: "GD-EXEMPLO",
  })
  return new NextResponse(bytes as BodyInit, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=certificado-preview.pdf", "Cache-Control": "private, no-store" },
  })
}
