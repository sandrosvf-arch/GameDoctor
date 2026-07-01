/**
 * POST /api/admin/aulas/[id]/generate-ai
 * Gera descrição e palavras-chave da aula com GPT a partir do transcript salvo.
 * Retorna os dados para revisão — não salva automaticamente.
 *
 * Requer: OPENAI_API_KEY no .env
 */
import { NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" })

// Limita o tamanho do transcript enviado ao GPT para garantir resposta dentro de ~10s (Vercel Free)
const MAX_TRANSCRIPT_CHARS = 12_000

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const lesson = await db.lesson.findUnique({
    where: { id },
    select: { title: true, transcription: true, transcriptionStatus: true },
  })

  if (!lesson) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 })
  if (!lesson.transcription) {
    return NextResponse.json({ error: "Transcrição ainda não disponível. Transcreva o áudio primeiro." }, { status: 400 })
  }

  const transcript =
    lesson.transcription.length > MAX_TRANSCRIPT_CHARS
      ? lesson.transcription.slice(0, MAX_TRANSCRIPT_CHARS) + "\n[...]"
      : lesson.transcription

    const prompt = `Você é um especialista em SEO interno e descoberta de conteúdo para uma plataforma de cursos de manutenção e reparo de videogames e eletrônicos.

Título da aula: "${lesson.title}"

Transcrição:
${transcript}

Analise o conteúdo e gere:

1. DESCRIÇÃO: Resumo completo e eficiente da aula em 3 a 5 frases em português. Deve cobrir obrigatoriamente:
   - Qual equipamento ou modelo é abordado
   - Quais sintomas ou problemas são discutidos
   - Qual solução, técnica ou componente é ensinado
   - O que o aluno será capaz de fazer após a aula

  2. PALAVRAS-CHAVE: gere 12 a 18 keywords altamente específicas para ESTA aula, pensando no que o usuário realmente digitaria para encontrar exatamente este conteúdo.

  Regras obrigatórias para as keywords:
    - Priorize frases de busca específicas de 2 a 5 palavras, não palavras soltas.
    - Foque no assunto central da aula, não no nicho geral da plataforma.
    - Use intenção de busca real: problema, ação, diagnóstico, técnica, custo, erro, sintoma, componente ou resultado ensinado.
    - Se a aula for sobre precificação, inclua termos como "como precificar", "quanto cobrar", "preço do reparo", "custo do conserto", e não termos genéricos como "reparo" ou "manutenção" isoladamente.
    - Se a aula for sobre defeito, inclua o defeito específico com o equipamento específico.
    - Se a aula mencionar componente, inclua o componente ligado ao contexto do defeito ou solução.
    - Se houver código de erro, inclua o código junto do equipamento ou problema.
    - Pode incluir 2 ou 3 variações de escrita úteis, mas somente se continuarem específicas.

  Evite explicitamente keywords amplas, vagas ou genéricas como:
    - "reparo"
    - "conserto"
    - "manutenção"
    - "assistência técnica"
    - "componente"
    - "videogame"
    - "console"
    - "serviço"
    - "garantia"

  Esses termos só podem aparecer se fizerem parte de uma frase específica, por exemplo:
    - "preço do reparo ps5"
    - "quanto cobrar troca hdmi ps4"
    - "diagnóstico nintendo dsi não liga"

  Formato das keywords:
    - todas em letras minúsculas
    - separadas por vírgula
    - sem numeração
    - sem explicações
    - sem repetir ideias equivalentes demais

Responda apenas com JSON válido, sem blocos de código:
{"description": "...", "keywords": "..."}`

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 600,
  })

  const raw = completion.choices[0].message.content ?? "{}"
  let parsed: { description?: string; keywords?: string }
  try {
    parsed = JSON.parse(raw) as { description?: string; keywords?: string }
  } catch {
    return NextResponse.json({ error: "Falha ao interpretar resposta da IA" }, { status: 500 })
  }

  return NextResponse.json({
    description: parsed.description ?? "",
    keywords: parsed.keywords ?? "",
  })
}
