import { randomBytes } from "node:crypto"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { db } from "@/lib/db"
import { hasActivePlanAccess } from "@/lib/access"
import { CERTIFICATE_TEMPLATE_KEY, readAppSettings } from "@/lib/app-settings"

export type CertificateElement = {
  id: string
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  color: string
  align: "left" | "center" | "right"
  bold: boolean
}

export type CertificateTemplate = {
  backgroundUrl: string | null
  title: string
  elements: CertificateElement[]
}

export const DEFAULT_CERTIFICATE_TEMPLATE: CertificateTemplate = {
  backgroundUrl: null,
  title: "Certificado de conclusão",
  elements: [
    { id: "heading", text: "CERTIFICADO DE CONCLUSÃO", x: 10, y: 20, width: 80, height: 8, fontSize: 28, color: "#163047", align: "center", bold: true },
    { id: "name", text: "{{nome}}", x: 10, y: 42, width: 80, height: 8, fontSize: 24, color: "#163047", align: "center", bold: true },
    { id: "title", text: "{{titulo}}", x: 10, y: 54, width: 80, height: 7, fontSize: 16, color: "#163047", align: "center", bold: false },
    { id: "date", text: "Emitido em {{data}} · Código {{codigo}}", x: 10, y: 78, width: 80, height: 5, fontSize: 10, color: "#526273", align: "center", bold: false },
  ],
}

function isElement(value: unknown): value is CertificateElement {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return typeof item.id === "string" && typeof item.text === "string"
    && ["x", "y", "width", "height", "fontSize"].every((key) => typeof item[key] === "number")
    && typeof item.color === "string"
    && ["left", "center", "right"].includes(String(item.align))
    && typeof item.bold === "boolean"
}

export function parseCertificateTemplate(value: string | null | undefined): CertificateTemplate {
  if (!value) return DEFAULT_CERTIFICATE_TEMPLATE
  try {
    const parsed = JSON.parse(value) as Partial<CertificateTemplate>
    const elements = Array.isArray(parsed.elements) ? parsed.elements.filter(isElement) : []
    if (elements.length === 0) return DEFAULT_CERTIFICATE_TEMPLATE
    return {
      backgroundUrl: typeof parsed.backgroundUrl === "string" ? parsed.backgroundUrl : null,
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : DEFAULT_CERTIFICATE_TEMPLATE.title,
      elements: elements.map((item) => ({
        ...item,
        x: Math.max(0, Math.min(100, item.x)), y: Math.max(0, Math.min(100, item.y)),
        width: Math.max(1, Math.min(100, item.width)), height: Math.max(1, Math.min(100, item.height)),
        fontSize: Math.max(6, Math.min(96, item.fontSize)),
      })),
    }
  } catch { return DEFAULT_CERTIFICATE_TEMPLATE }
}

export async function getCertificateTemplate() {
  const settings = await readAppSettings()
  return parseCertificateTemplate(settings.get(CERTIFICATE_TEMPLATE_KEY)?.value)
}

export async function getCertificateEligibility(userId: string, role?: string | null) {
  const isStaff = role === "ADMIN" || role === "EDITOR"
  const hasPlan = isStaff || await hasActivePlanAccess(userId)
  const totalLessons = await db.lesson.count({ where: { status: "PUBLISHED" } })
  const completedLessons = await db.lessonProgress.count({
    where: { userId, completed: true, lesson: { status: "PUBLISHED" } },
  })
  return {
    hasPlan,
    isStaff,
    totalLessons,
    completedLessons,
    eligible: !isStaff && hasPlan && totalLessons > 0 && completedLessons >= totalLessons,
  }
}

export function newCertificateCode() {
  return `GD-${randomBytes(5).toString("hex").toUpperCase()}`
}

function hexColor(value: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(value)
  if (!match) return rgb(0.09, 0.19, 0.28)
  const hex = match[1]
  return rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4), 16) / 255)
}

async function embedBackground(pdf: PDFDocument, url: string | null) {
  if (!url) return null
  try {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) return null
    const bytes = await response.arrayBuffer()
    const type = response.headers.get("content-type") ?? ""
    if (type.includes("png") || url.toLowerCase().endsWith(".png")) return pdf.embedPng(bytes)
    if (type.includes("jpeg") || type.includes("jpg") || /\.(jpe?g)(\?|$)/i.test(url)) return pdf.embedJpg(bytes)
    return null
  } catch { return null }
}

export async function renderCertificatePdf(input: {
  template: CertificateTemplate
  name: string
  title: string
  date: string
  code: string
}) {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([841.89, 595.28])
  const background = await embedBackground(pdf, input.template.backgroundUrl)
  if (background) page.drawImage(background, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() })

  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const values: Record<string, string> = {
    "{{nome}}": input.name,
    "{{titulo}}": input.title,
    "{{data}}": input.date,
    "{{codigo}}": input.code,
  }

  for (const element of input.template.elements) {
    const text = element.text.replace(/{{nome}}|{{titulo}}|{{data}}|{{codigo}}/g, (token) => values[token] ?? token)
    const font = element.bold ? bold : regular
    const size = element.fontSize
    const maxWidth = page.getWidth() * (element.width / 100)
    const textWidth = font.widthOfTextAtSize(text, size)
    const x = page.getWidth() * (element.x / 100) + (
      element.align === "center" ? Math.max(0, (maxWidth - textWidth) / 2)
        : element.align === "right" ? Math.max(0, maxWidth - textWidth) : 0
    )
    const y = page.getHeight() - page.getHeight() * (element.y / 100) - size
    page.drawText(text, { x, y, size, font, color: hexColor(element.color), maxWidth })
  }

  return pdf.save()
}
