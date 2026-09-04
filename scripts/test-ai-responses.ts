import OpenAI from "openai"
import { db } from "../src/lib/db"
import { AI_NO_CONTENT_MESSAGE, buildAiSystemPrompt, finalizeAiAnswer } from "../src/lib/ai/prompt"
import { routeAiConversation, type AiRoutingHistoryItem } from "../src/lib/ai/router"
import { searchAiContext, searchAiFaqContext } from "../src/lib/ai/search"
import { getAiSystemPrompts } from "../src/lib/ai/settings"
import type { AiContextItem } from "../src/lib/ai/search"

const model = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini"
const apiKey = process.env.OPENAI_API_KEY?.trim()
if (!apiKey) throw new Error("OPENAI_API_KEY não configurada.")

const openai = new OpenAI({ apiKey })

type TestCase = {
  name: string
  message: string
  category?: string
  history?: AiRoutingHistoryItem[]
  expectedAction: "respond" | "search"
  expectedHref?: string
  expectedSource?: AiContextItem["source"]
  expectedNoContent?: boolean
  queryTerms?: string[]
  expectedFaqAnswer?: string
  tier?: "paid" | "free"
  expectedRestricted?: boolean
}

const cases: TestCase[] = [
  { name: "saudação curta", message: "Oi", expectedAction: "respond" },
  { name: "conversa social", message: "Boa tarde, tudo bem?", expectedAction: "respond" },
  {
    name: "agradecimento após assunto técnico",
    message: "Obrigado pela ajuda!",
    history: [
      { role: "user", content: "Meu controle de Xbox está com drift." },
      { role: "assistant", content: "Encontrei uma aula relacionada ao diagnóstico de analógicos." },
    ],
    expectedAction: "respond",
  },
  { name: "despedida", message: "Valeu, até mais.", expectedAction: "respond" },
  { name: "mensagem sem contexto", message: "Não está funcionando.", expectedAction: "respond" },
  {
    name: "aula de Xbox clássico",
    message: "Como faço o desbloqueio de um Xbox clássico com placa 1.6 usando Modxo e FATXplorer?",
    expectedAction: "search",
    expectedHref: "66915432-83f3-4be9-90fc-3ff514dcc292",
  },
  {
    name: "calibração de controle",
    message: "O analógico do meu controle Xbox Series ficou fora do centro. Existe calibração por software?",
    expectedAction: "search",
    expectedHref: "5525e25f-9afb-4d64-a824-516603e3b075",
  },
  {
    name: "erro de PS4",
    message: "Meu PS4 apresenta o erro CE-34878-0. A plataforma explica esse defeito e suas variantes?",
    expectedAction: "search",
    expectedHref: "14df535a-89bb-4e2f-9a48-39892f1ecff1",
  },
  {
    name: "temperatura de BGA",
    message: "Qual temperatura usar na estação de ar para fazer retrabalho BGA?",
    expectedAction: "search",
    expectedHref: "e4fcf45c-5177-4484-803e-9124360798ad",
  },
  {
    name: "conteúdo inexistente",
    message: "Tem aula ensinando a reparar uma torradeira industrial?",
    expectedAction: "search",
    expectedNoContent: true,
  },
  {
    name: "fallback da comunidade",
    message: "Na comunidade alguém comentou sobre um PS5 que liga, fica poucos segundos ligado e desliga sozinho?",
    expectedAction: "search",
    expectedHref: "51654ca9-9b4e-47ed-9c37-5972f4c024c9",
  },
  {
    name: "funcionamento da comunidade",
    expectedHref: "/comunidade",
    expectedSource: "platform",
    message: "Onde posso perguntar, tirar dúvidas e conversar com outros alunos?",
    expectedAction: "search",
  },
  {
    name: "continuação contextual",
    message: "E no PS5?",
    history: [
      { role: "user", content: "Estou procurando conteúdo sobre um PS4 que não liga." },
      { role: "assistant", content: "Entendi. Você quer encontrar aulas relacionadas a esse defeito." },
    ],
    expectedAction: "search",
    queryTerms: ["ps5", "não liga"],
  },
]

const additionalCases: TestCase[] = [
  { name: "PS4 abreviado", category: "aulas", message: "ps4 n liga, tem aula?", expectedAction: "search" },
  { name: "Xbox com erro de escrita", category: "aulas", message: "xbox one nao liga e fica piscano", expectedAction: "search" },
  { name: "Nintendo resumido", category: "aulas", message: "switch n carrega", expectedAction: "search" },
  { name: "controle abreviado", category: "aulas", message: "meu dualshock 4 ta c drift", expectedAction: "search" },
  { name: "aula de HDMI no PS4", category: "aulas", message: "tem conteudo sobre hdmi do ps4?", expectedAction: "search" },
  { name: "aula de fonte do PS5", category: "aulas", message: "PS5 nao da sinal, queria ver fonte", expectedAction: "search" },
  { name: "aula de Xbox 360", category: "aulas", message: "tem reparo de xbox 360 que nao liga?", expectedAction: "search" },
  { name: "aula de Nintendo Wii", category: "aulas", message: "voces ensinam manutencao de wii?", expectedAction: "search" },
  { name: "aula de Joy-Con", category: "aulas", message: "como arrumar drift no joy con?", expectedAction: "search" },
  { name: "existencia de trilhas", category: "trilhas", message: "tem uma trilha para quem esta comecando do zero?", expectedAction: "search" },
  { name: "organizacao do conteudo", category: "trilhas", message: "as aulas ficam separadas por modulos ou trilhas?", expectedAction: "search" },
  { name: "planos da plataforma", category: "plataforma", message: "quais planos voces tem hoje?", expectedAction: "search" },
  { name: "progresso do aluno", category: "plataforma", message: "onde eu vejo minhas aulas concluidas?", expectedAction: "search" },
  { name: "materiais para baixar", category: "plataforma", message: "onde ficam os materiais para baixar?", expectedAction: "search" },
  { name: "suporte resumido", category: "plataforma", message: "onde peco ajuda?", expectedAction: "search" },
  { name: "pedido de aula externo", category: "sem-conteudo", message: "tem aula de conserto de cafeteira industrial?", expectedAction: "search", expectedNoContent: true },
  { name: "assunto externo", category: "sem-conteudo", message: "qual e a previsao do tempo amanha?", expectedAction: "respond" },
  { name: "pergunta tecnica sem equipamento", category: "sem-conteudo", message: "como faco isso funcionar?", expectedAction: "respond" },
  {
    name: "continuacao sobre controle",
    category: "conversa-encadeada",
    message: "e no controle?",
    history: [
      { role: "user", content: "Estou procurando uma aula sobre drift no PS5." },
      { role: "assistant", content: "Vou procurar conteudos sobre esse defeito." },
    ],
    expectedAction: "search",
  },
  {
    name: "referencia anterior",
    category: "conversa-encadeada",
    message: "essa aula e para iniciante?",
    history: [
      { role: "user", content: "Encontre uma aula de temperatura para retrabalho BGA." },
      { role: "assistant", content: "Encontrei uma aula sobre estacao de ar e retrabalho BGA." },
    ],
    expectedAction: "search",
  },
  { name: "tecnica para usuario gratuito", category: "acesso", message: "como diagnosticar um PS4 que nao liga?", expectedAction: "search", tier: "free", expectedRestricted: true },
  { name: "aulas para usuario gratuito", category: "acesso", message: "quero encontrar aulas de PS4", expectedAction: "search", tier: "free", expectedRestricted: true },
  { name: "comunidade para usuario gratuito", category: "acesso", message: "posso acessar a comunidade?", expectedAction: "search", tier: "free" },
]

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim()
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

async function loadFaqCases(): Promise<TestCase[]> {
  const articles = await db.helpArticle.findMany({
    where: { status: "ACTIVE", category: { slug: "duvidas-frequentes", status: "ACTIVE" } },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: { title: true, content: true },
  })

  return articles.flatMap((article) => {
    const expectedFaqAnswer = stripHtml(article.content)
    const title = article.title.replace(/[?!.]+$/, "")

    return [
      { name: `FAQ literal: ${article.title}`, message: article.title, expectedAction: "search" as const, expectedFaqAnswer },
      { name: `FAQ variação: ${article.title}`, message: `Quero entender melhor: ${title}.`, expectedAction: "search" as const, expectedFaqAnswer },
    ]
  })
}

function isKnowledgeQuestion(message: string) {
  const normalized = message.trim().toLowerCase()
  if (normalized.startsWith("obrigad") || normalized.startsWith("valeu")) return false
  const social = /^(oi|ol[aá]|opa|bom dia|boa tarde|boa noite|tudo bem|obrigad|valeu|tchau|at[eé] mais)\b/i.test(normalized)
  if (social) return false
  if (/^como fa[cç]o isso funcionar\b/i.test(normalized)) return false
  return /\b(ps[345]|xbox|nintendo|controle|aula|curso|trilha|defeito|erro|reparo|assist[eê]ncia|plano|comunidade|ferramenta|ajuda|suporte|progresso|download|assinatura|conversar|perguntar|d[uú]vida)\b/i.test(message)
}

function shouldCheckFaq(message: string) {
  const normalized = message.trim().toLowerCase()
  if (normalized.startsWith("obrigad") || normalized.startsWith("valeu")) return false
  const social = /^(oi|ol[aá]|opa|bom dia|boa tarde|boa noite|tudo bem|obrigad|valeu|tchau|at[eé] mais)\b/i.test(normalized)
  return !social && (message.includes("?") || /^(como|qual|quais|onde|quando|por que|porque|tem|existe|preciso|quero|o que|posso|consigo|vou|e se|me explica|me diga)\b/i.test(normalized))
}

function isSocialMessage(message: string) {
  const normalized = message.trim().toLowerCase()
  return normalized.startsWith("obrigad") || normalized.startsWith("valeu")
    || /^(oi|ol[aá]|opa|bom dia|boa tarde|boa noite|tudo bem|tchau|at[eé] mais)\b/i.test(normalized)
}

async function main() {
  const prompts = await getAiSystemPrompts()
  const allCases = [...await loadFaqCases(), ...cases, ...additionalCases]
  let passed = 0
  const categoryTotals = new Map<string, { passed: number; total: number }>()
  const failures: string[] = []

  for (const testCase of allCases) {
    const category = testCase.category ?? "geral"
    const categoryResult = categoryTotals.get(category) ?? { passed: 0, total: 0 }
    categoryResult.total += 1
    categoryTotals.set(category, categoryResult)
    const systemPrompt = testCase.tier === "free" ? prompts.free : prompts.paid
    const faqSearch = shouldCheckFaq(testCase.message)
      ? await searchAiFaqContext(testCase.message)
      : { context: [], embedding: null }
    const faqContext = faqSearch.context[0]?.source === "help" ? faqSearch.context[0] : null
    const routing = faqContext
      ? { action: "search" as const, query: testCase.message, answer: null, inputTokens: null, outputTokens: null }
      : isSocialMessage(testCase.message)
        ? { action: "respond" as const, query: null, answer: "De nada! Se precisar de mais ajuda, é só avisar.", inputTokens: null, outputTokens: null }
      : await routeAiConversation({
      openai,
      model,
      promptText: systemPrompt,
      history: testCase.history ?? [],
      message: testCase.message,
    })
    const forceSearch = isKnowledgeQuestion(testCase.message)
    const effectiveAction = faqContext || forceSearch ? "search" : routing?.action
    const searchQuery = routing?.query ?? testCase.message
    const context = faqContext
      ? faqSearch.context
      : (routing?.action === "search" || forceSearch)
        ? await searchAiContext(searchQuery, testCase.tier !== "free", searchQuery === testCase.message
          ? { skipFaq: true, embedding: faqSearch.embedding }
          : { skipFaq: true })
        : []
    let answer = routing.answer ?? "Ainda não temos um conteúdo específico sobre esse assunto. [Solicitar uma aula](/busca?sugerir=1)"

    if (effectiveAction === "search") {
      answer = `${AI_NO_CONTENT_MESSAGE} [Solicitar uma aula](/busca?sugerir=1)`
    }

    if (faqContext) {
      answer = faqContext.text
    } else if (effectiveAction === "search" && context.length > 0) {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: buildAiSystemPrompt(systemPrompt, context) },
          ...(testCase.history ?? []),
          { role: "user", content: testCase.message },
        ],
        temperature: 0,
        max_tokens: 450,
      })
      answer = completion.choices[0]?.message?.content?.trim() || "SEM RESPOSTA"
    }
    answer = faqContext ? answer : finalizeAiAnswer(answer, context).answer

    const actionOk = effectiveAction === testCase.expectedAction
    const hrefOk = !testCase.expectedHref || context.some((item) => item.href.includes(testCase.expectedHref!))
    const sourceOk = !testCase.expectedSource || context[0]?.source === testCase.expectedSource
    const noContentOk = !testCase.expectedNoContent || context.length === 0
    const normalizedQuery = normalize(routing.query ?? "")
    const queryOk = !testCase.queryTerms || testCase.queryTerms.every((term) => normalizedQuery.includes(normalize(term)))
    const noUnexpectedRetrieval = effectiveAction !== "respond" || context.length === 0
    const firstInternalLink = answer.match(/\]\((\/[^)]+)\)/)?.[1] ?? null
    const primaryLinkOk = !testCase.expectedHref || firstInternalLink?.includes(testCase.expectedHref) === true
    const answerOk = testCase.expectedNoContent
      ? answer.includes(AI_NO_CONTENT_MESSAGE)
      : routing?.action === "respond" || !answer.includes(AI_NO_CONTENT_MESSAGE)
    const faqAnswerOk = !testCase.expectedFaqAnswer || normalize(answer) === normalize(testCase.expectedFaqAnswer)
    const restrictedOk = !testCase.expectedRestricted || context
      .filter((item) => item.source === "lesson" || item.source === "community")
      .every((item) => item.text.includes("plano ativo"))
    const ok = actionOk && hrefOk && sourceOk && noContentOk && queryOk && noUnexpectedRetrieval && primaryLinkOk && answerOk && faqAnswerOk && restrictedOk
    if (ok) {
      passed += 1
      categoryResult.passed += 1
    } else {
      failures.push(`${testCase.name}: ${[
        !actionOk && "aÃ§Ã£o",
        !hrefOk && "fonte/link",
        !sourceOk && "tipo da fonte",
        !noContentOk && "conteÃºdo inesperado",
        !queryOk && "consulta",
        !noUnexpectedRetrieval && "roteamento",
        !primaryLinkOk && "link principal",
        !answerOk && "resposta",
        !faqAnswerOk && "FAQ nÃ£o literal",
        !restrictedOk && "vazamento gratuito",
      ].filter(Boolean).join(", ")}`)
    }

    console.log("\n============================================================")
    console.log(`[${ok ? "OK" : "FALHOU"}] ${testCase.name}`)
    console.log(`Mensagem: ${testCase.message}`)
    console.log(`Categoria: ${category} | Tier: ${testCase.tier ?? "paid"}`)
    if (testCase.expectedFaqAnswer) console.log(`FAQ literal: ${faqAnswerOk ? "sim" : "nÃ£o"}`)
    console.log(`Decisão: ${routing.action}${routing.query ? ` | Busca: ${routing.query}` : ""}`)
    console.log("Fontes:")
    if (context.length === 0) console.log("- nenhuma")
    for (const item of context) {
      console.log(`- [${item.source}] ${item.title} (${item.score?.toFixed(3) ?? "textual"}) -> ${item.href}`)
    }
    console.log(`Resposta:\n${answer}`)
  }

  console.log(`\nResultado: ${passed}/${allCases.length} casos aprovados.`)
  console.log("Resumo por categoria:")
  for (const [category, result] of categoryTotals) console.log(`- ${category}: ${result.passed}/${result.total}`)
  if (failures.length > 0) console.log(`Falhas: ${failures.join(" | ")}`)
  if (passed !== allCases.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
