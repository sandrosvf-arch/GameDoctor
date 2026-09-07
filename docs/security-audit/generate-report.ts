import { mkdir, writeFile } from "node:fs/promises"
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib"

const outputPath = "docs/security-audit/relatorio-auditoria-seguranca.pdf"
const pageWidth = 595.28
const pageHeight = 841.89
const margin = 56
const colors = {
  ink: rgb(0.11, 0.14, 0.18),
  muted: rgb(0.35, 0.4, 0.46),
  line: rgb(0.84, 0.87, 0.9),
  panel: rgb(0.96, 0.97, 0.98),
  critical: rgb(0.725, 0.11, 0.11),
  high: rgb(0.918, 0.345, 0.047),
  medium: rgb(0.843, 0.467, 0.024),
  low: rgb(0.145, 0.388, 0.922),
  strong: rgb(0.02, 0.588, 0.302),
  white: rgb(1, 1, 1),
}

type Severity = "alta" | "média" | "baixa"
type Finding = {
  id: string
  category: string
  severity: Severity
  location: string
  title: string
  evidence: string
  exploitability: string
  impact: string
  recommendation: string
}

const findings: Finding[] = [
  {
    id: "SEC-001",
    category: "Permissão / chaves",
    severity: "alta",
    location: "src/app/api/admin/lessons/[id]/route.ts:19-21",
    title: "Rota administrativa aceita segredo padrão conhecido",
    evidence: 'const expectedKey = process.env.ADMIN_SECRET ?? "dev-only";\nif (process.env.NODE_ENV !== "development" && adminKey !== expectedKey) ...',
    exploitability: "Em produção, se ADMIN_SECRET não estiver configurado, qualquer pessoa que envie x-admin-key: dev-only passa pelo único gate da rota.",
    impact: "Permite alterar os campos de vídeo de qualquer aula, incluindo URLs de reprodução e thumbnail.",
    recommendation: "Remover o fallback, exigir uma variável forte no startup ou migrar a rota para auth() com papel ADMIN/EDITOR.",
  },
  {
    id: "SEC-002",
    category: "XSS armazenado",
    severity: "alta",
    location: "src/app/api/comunidade/topicos/[slug]/posts/route.ts:234-240; src/components/community/CommunityTopicClient.tsx:1559",
    title: "Conteúdo da comunidade é salvo e renderizado como HTML sem sanitização",
    evidence: "content, status: autoApprove ? \"APPROVED\" : \"PENDING\" ...; <div dangerouslySetInnerHTML={{ __html: content }} />",
    exploitability: "Um assinante pode enviar conteúdo com HTML e, quando aprovado ou autoaprovado, ele é inserido diretamente no DOM de outros alunos e administradores.",
    impact: "Execução de JavaScript no navegador de leitores, roubo de sessão e ações em nome do usuário afetado.",
    recommendation: "Sanitizar no servidor com allowlist de tags/atributos antes de salvar e aplicar a mesma sanitização na renderização; rejeitar scripts, eventos e URLs perigosas.",
  },
  {
    id: "SEC-003",
    category: "XSS / URLs",
    severity: "média",
    location: "src/lib/help-content.ts:11-17; src/components/help/HelpCenterClient.tsx:58-82, 309-312",
    title: "Sanitizador manual de FAQ não valida URLs codificadas",
    evidence: 'sanitizeHelpHtml remove apenas a sequência literal "javascript:"; linkifyPlainUrls devolve HTML para dangerouslySetInnerHTML.',
    exploitability: "Um atributo como href=\"java&#x73;cript:...\" ou uma URL data: pode sobreviver ao filtro textual e ser interpretado pelo navegador.",
    impact: "Um editor ou conteúdo previamente contaminado pode gerar link executável no FAQ; o ataque depende de publicação do conteúdo.",
    recommendation: "Trocar o filtro por DOMPurify/isomorphic-dompurify ou sanitizer equivalente com allowlist de tags, atributos e protocolos http/https/mailto.",
  },
  {
    id: "SEC-004",
    category: "XSS / URLs",
    severity: "média",
    location: "src/app/api/comunidade/topicos/[slug]/posts/route.ts:211-230; src/app/(admin)/admin/tickets/page.tsx:664-679",
    title: "URLs de anexos são aceitas sem allowlist de origem ou protocolo",
    evidence: "fileUrl: attachment.url.trim(); depois o valor é usado diretamente em href={attachment.fileUrl} e src={attachment.fileUrl}.",
    exploitability: "O cliente pode enviar uma URL arbitrária no JSON do post/ticket; a aplicação persiste e renderiza o valor para leitores e para a equipe.",
    impact: "Phishing por link externo e possibilidade de esquemas perigosos em navegadores que aceitem URL não confiável.",
    recommendation: "Aceitar somente URLs emitidas pelo endpoint de upload ou hosts aprovados, exigir https e validar novamente no servidor antes de persistir.",
  },
]

const severityColors: Record<Severity, typeof colors.high> = {
  alta: colors.high,
  média: colors.medium,
  baixa: colors.low,
}

function wrap(text: string, maxChars: number) {
  const lines: string[] = []
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    let line = ""
    for (const word of words) {
      if ((line + (line ? " " : "") + word).length <= maxChars) {
        line += (line ? " " : "") + word
      } else {
        if (line) lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
  }
  return lines.length ? lines : [""]
}

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = colors.ink) {
  page.drawText(text, { x, y, font, size, color })
}

function drawWrapped(page: PDFPage, text: string, x: number, y: number, width: number, font: PDFFont, size: number, color = colors.ink, leading = size * 1.35) {
  const maxChars = Math.max(18, Math.floor(width / (size * 0.53)))
  let cursor = y
  for (const line of wrap(text, maxChars)) {
    drawText(page, line, x, cursor, font, size, color)
    cursor -= leading
  }
  return cursor
}

function headerFooter(page: PDFPage, pageNumber: number, regular: PDFFont) {
  page.drawLine({ start: { x: margin, y: pageHeight - 39 }, end: { x: pageWidth - margin, y: pageHeight - 39 }, thickness: 0.6, color: colors.line })
  drawText(page, "GameDoctor | Auditoria de Segurança", margin, pageHeight - 29, regular, 8, colors.muted)
  drawText(page, `Página ${pageNumber}`, pageWidth - margin - 43, 28, regular, 8, colors.muted)
}

function title(page: PDFPage, text: string, bold: PDFFont, y: number) {
  drawText(page, text, margin, y, bold, 21, colors.ink)
  page.drawLine({ start: { x: margin, y: y - 10 }, end: { x: pageWidth - margin, y: y - 10 }, thickness: 1.2, color: colors.strong })
}

function addFinding(page: PDFPage, finding: Finding, regular: PDFFont, bold: PDFFont, y: number) {
  const boxHeight = 214
  page.drawRectangle({ x: margin, y: y - boxHeight, width: pageWidth - 2 * margin, height: boxHeight, color: colors.panel, borderColor: colors.line, borderWidth: 0.7 })
  page.drawRectangle({ x: margin, y: y - 28, width: 62, height: 28, color: severityColors[finding.severity] })
  drawText(page, finding.severity.toUpperCase(), margin + 9, y - 19, bold, 8, colors.white)
  drawText(page, finding.id, margin + 74, y - 19, bold, 9, colors.muted)
  drawText(page, finding.category, pageWidth - margin - 118, y - 19, regular, 8, colors.muted)
  let cursor = y - 46
  cursor = drawWrapped(page, finding.title, margin + 12, cursor, pageWidth - 2 * margin - 24, bold, 12, colors.ink, 15) - 4
  for (const [label, value] of [["Arquivo", finding.location], ["Evidência", finding.evidence], ["Explorabilidade", finding.exploitability], ["Impacto", finding.impact]] as const) {
    drawText(page, `${label}:`, margin + 12, cursor, bold, 8.5, colors.ink)
    cursor = drawWrapped(page, value, margin + 78, cursor, pageWidth - 2 * margin - 90, regular, 8.5, colors.muted, 11) - 3
  }
  return y - boxHeight - 18
}

async function main() {
  await mkdir("docs/security-audit", { recursive: true })
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let pageNumber = 0
  const newPage = () => {
    const page = pdf.addPage([pageWidth, pageHeight])
    pageNumber += 1
    headerFooter(page, pageNumber, regular)
    return page
  }

  let page = newPage()
  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(0.035, 0.055, 0.08) })
  drawText(page, "GameDoctor", margin, pageHeight - 145, bold, 18, rgb(0.4, 0.91, 0.97))
  drawText(page, "Relatório de Auditoria de Segurança", margin, pageHeight - 235, bold, 30, colors.white)
  drawText(page, "Auditoria estática orientada a evidências", margin, pageHeight - 270, regular, 14, rgb(0.75, 0.82, 0.9))
  page.drawLine({ start: { x: margin, y: pageHeight - 300 }, end: { x: pageWidth - margin, y: pageHeight - 300 }, thickness: 2, color: rgb(0.02, 0.72, 0.82) })
  drawText(page, "Data: 07/09/2026", margin, pageHeight - 345, regular, 12, colors.white)
  drawText(page, "Escopo: aplicação web, API, autenticação, banco, frontend e histórico Git", margin, pageHeight - 370, regular, 11, rgb(0.75, 0.82, 0.9))
  drawWrapped(page, "Nota metodológica: a auditoria mapeou RLS/isolamento manual para PostgreSQL + Prisma + Supabase, gates de papel para Next.js/NextAuth, IDOR em todos os 119 handlers de API, segredos no código/configuração/histórico/bundle e sinks HTML/URL no React.", margin, 180, pageWidth - 2 * margin, regular, 11, rgb(0.75, 0.82, 0.9), 16)

  page = newPage()
  title(page, "Resumo executivo", bold, pageHeight - 82)
  drawWrapped(page, "Foram confirmados 4 achados acionáveis: 2 de severidade alta e 2 de severidade média. Não foram confirmados achados de IDOR em rotas de membros nem vazamento de chaves reais no bundle ou nos arquivos rastreados.", margin, pageHeight - 125, pageWidth - 2 * margin, regular, 11, colors.muted)
  const counts = { alta: 2, média: 2, baixa: 0 }
  const chartX = 150
  const chartY = 500
  const total = 4
  const segments = [{ key: "alta" as const, count: 2 }, { key: "média" as const, count: 2 }]
  const radius = 66
  for (let i = 0; i < 36; i++) {
    const portion = (i + 0.5) / 36
    const segment = portion < 0.5 ? segments[0] : segments[1]
    const angle = (i / 36) * Math.PI * 2
    const nextAngle = ((i + 1) / 36) * Math.PI * 2
    const a = { x: chartX + Math.cos(angle) * radius, y: chartY + Math.sin(angle) * radius }
    const b = { x: chartX + Math.cos(nextAngle) * radius, y: chartY + Math.sin(nextAngle) * radius }
    page.drawLine({ start: a, end: b, thickness: 18, color: severityColors[segment.key] })
  }
  page.drawCircle({ x: chartX, y: chartY, size: 42, color: colors.white })
  drawText(page, String(total), chartX - 8, chartY - 5, bold, 16, colors.ink)
  drawText(page, "Achados", chartX - 24, chartY - 22, regular, 8, colors.muted)
  drawText(page, "Distribuição por severidade", 80, 400, bold, 10, colors.ink)
  for (const [index, item] of ["alta", "média", "baixa"].entries()) {
    const y = 375 - index * 22
    page.drawRectangle({ x: 84, y: y - 2, width: 12, height: 12, color: severityColors[item as Severity] })
    drawText(page, `${item}: ${counts[item as Severity]}`, 104, y, regular, 9, colors.muted)
  }
  const bars = [
    ["Banco/RLS", 0, colors.strong],
    ["Permissão", 1, colors.high],
    ["IDOR", 0, colors.strong],
    ["Chaves", 1, colors.high],
    ["XSS/URLs", 3, colors.medium],
  ] as const
  drawText(page, "Achados por categoria", 315, 590, bold, 10, colors.ink)
  bars.forEach(([label, value, color], index) => {
    const y = 560 - index * 32
    drawText(page, label, 315, y, regular, 8.5, colors.muted)
    page.drawRectangle({ x: 390, y: y - 2, width: Math.max(3, value * 42), height: 13, color })
    drawText(page, String(value), 520, y, bold, 9, colors.ink)
  })

  page = newPage()
  title(page, "Stack e mecanismo de isolamento", bold, pageHeight - 82)
  const stack = "Linguagem: TypeScript/JavaScript. Framework: Next.js 16 App Router + React 19. ORM: Prisma 6 sobre PostgreSQL hospedado no Supabase. Auth: NextAuth/Auth.js v5 com sessão JWT e credenciais/Google. Frontend: React, Tailwind, Radix UI e react-markdown. Deploy detectado no repositório: Vercel via configuração/env; não foram encontrados Docker, Helm ou Terraform rastreados."
  drawWrapped(page, stack, margin, pageHeight - 125, pageWidth - 2 * margin, regular, 10.5, colors.muted, 15)
  drawText(page, "Isolamento", margin, pageHeight - 240, bold, 14, colors.ink)
  drawWrapped(page, "Não há RLS, CREATE POLICY ou ENABLE ROW LEVEL SECURITY nas migrations revisadas. O projeto usa Prisma no servidor e isolamento manual: consultas de membros normalmente incluem userId derivado da sessão; áreas administrativas são protegidas por papel. Isso é uma observação de defesa em profundidade, não foi contado como vazamento confirmado porque não há cliente usando a chave anônima do Supabase para consultar as tabelas.", margin, pageHeight - 270, pageWidth - 2 * margin, regular, 10.5, colors.muted, 15)
  drawText(page, "Pontos fortes verificados", margin, pageHeight - 400, bold, 14, colors.ink)
  const strengths = [
    "119 handlers de API foram enumerados; as rotas administrativas, salvo a rota especial SEC-001, validam sessão e papel ADMIN/EDITOR no servidor.",
    "Tickets, progresso, conversas de IA, perfil, certificados e checkout padrão filtram objetos pelo usuário autenticado ou por token público hash/expiração.",
    "Vídeos pagos passam por hasAccessToLesson no backend antes de receber URL de reprodução.",
    "E-mails transacionais escapam nome, plano e URLs antes de inserir valores no HTML.",
    "Não foram encontrados valores de chaves reais no bundle estático ou nos arquivos rastreados; .env.example usa placeholders.",
  ]
  let cursor = pageHeight - 430
  for (const item of strengths) {
    drawText(page, "-", margin, cursor, bold, 11, colors.strong)
    cursor = drawWrapped(page, item, margin + 18, cursor, pageWidth - 2 * margin - 18, regular, 10, colors.muted, 14) - 8
  }

  page = newPage()
  title(page, "Achados detalhados", bold, pageHeight - 82)
  cursor = pageHeight - 125
  for (const finding of findings.slice(0, 2)) cursor = addFinding(page, finding, regular, bold, cursor)
  page = newPage()
  title(page, "Achados detalhados", bold, pageHeight - 82)
  cursor = pageHeight - 125
  for (const finding of findings.slice(2)) cursor = addFinding(page, finding, regular, bold, cursor)

  page = newPage()
  title(page, "Recomendações priorizadas", bold, pageHeight - 82)
  const recommendations = [
    ["P1", "Eliminar o fallback dev-only da rota Bunny e exigir auth() + ADMIN/EDITOR ou segredo obrigatório validado no startup."],
    ["P2", "Sanitizar HTML de comunidade e FAQ com biblioteca de allowlist; aplicar sanitização também ao renderizar conteúdo legado."],
    ["P3", "Validar anexos no servidor: somente URLs https emitidas pelos buckets esperados, sem aceitar URL arbitrária no JSON."],
    ["P4", "Adicionar RLS de defesa em profundidade ou documentar formalmente que o banco só é acessível pelo backend com service role/Prisma."],
    ["P5", "Adicionar testes de segurança para cada rota dinâmica: papel, posse, protocolo de URL e payload HTML malicioso."],
  ] as const
  cursor = pageHeight - 125
  for (const [priority, recommendation] of recommendations) {
    page.drawRectangle({ x: margin, y: cursor - 3, width: 30, height: 18, color: priority === "P1" ? colors.critical : colors.low })
    drawText(page, priority, margin + 7, cursor + 2, bold, 8, colors.white)
    cursor = drawWrapped(page, recommendation, margin + 44, cursor + 2, pageWidth - 2 * margin - 44, regular, 11, colors.ink, 15) - 20
  }
  drawText(page, "Pontos fracos centrais", margin, cursor, bold, 14, colors.ink)
  drawWrapped(page, "O risco mais urgente é a rota administrativa protegida por um valor padrão público. Em seguida, a comunidade permite conteúdo HTML ativo e o FAQ depende de um sanitizer manual incompleto. Esses riscos devem ser corrigidos antes de ampliar publicação de conteúdo por usuários ou expor novas rotas administrativas.", margin, cursor - 30, pageWidth - 2 * margin, regular, 10.5, colors.muted, 15)

  page = newPage()
  title(page, "ISSUES PARA O GITHUB", bold, pageHeight - 82)
  drawWrapped(page, "Issues acionáveis, completas e prontas para copiar e colar. O texto abaixo foi mantido no PDF para preservar o contexto da auditoria.", margin, pageHeight - 125, pageWidth - 2 * margin, regular, 10, colors.muted)
  cursor = pageHeight - 175
  const issues = findings.map((finding) => `--- ISSUE ${finding.id} ---\n# Título\n[Segurança] ${finding.title}\n\nLabels sugeridas: security, ${finding.severity}\n\n## Descrição\n${finding.exploitability}\n\n## Evidência\n${finding.location}\n\`\`\`ts\n${finding.evidence}\n\`\`\`\n\n## Impacto\n${finding.impact}\n\n## Sugestão de correção\n${finding.recommendation}\n\n## Critérios de aceite\n- [ ] O comportamento inseguro não é mais possível com entrada não autenticada ou não confiável.\n- [ ] Existem testes automatizados cobrindo o cenário reportado.\n- [ ] O conteúdo legado foi revisado ou migrado com segurança.\n- [ ] TypeScript, testes direcionados e revisão de segurança passam.\n--- FIM ISSUE ${finding.id} ---`)
  for (const issue of issues) {
    const lines = wrap(issue, 88)
    const needed = lines.length * 10 + 20
    if (cursor - needed < 55) {
      page = newPage()
      cursor = pageHeight - 82
    }
    for (const line of lines) {
      drawText(page, line, margin, cursor, regular, 7.5, colors.ink)
      cursor -= 10
    }
    cursor -= 10
  }

  const bytes = await pdf.save()
  await writeFile(outputPath, bytes)
  const check = await PDFDocument.load(bytes)
  console.log(`PDF gerado: ${outputPath}; paginas=${check.getPageCount()}; bytes=${bytes.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
