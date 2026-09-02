import OpenAI from "openai"
import { AI_NO_CONTENT_MESSAGE, buildAiSystemPrompt, finalizeAiAnswer } from "../src/lib/ai/prompt"
import { routeAiConversation, type AiRoutingHistoryItem } from "../src/lib/ai/router"
import { searchAiContext } from "../src/lib/ai/search"
import { getAiSystemPrompts } from "../src/lib/ai/settings"

const model = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini"
const apiKey = process.env.OPENAI_API_KEY?.trim()
if (!apiKey) throw new Error("OPENAI_API_KEY não configurada.")

const openai = new OpenAI({ apiKey })

type TestCase = {
  name: string
  message: string
  history?: AiRoutingHistoryItem[]
  expectedAction: "respond" | "search"
  expectedHref?: string
  expectedNoContent?: boolean
  queryTerms?: string[]
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

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

async function main() {
  const prompts = await getAiSystemPrompts()
  const systemPrompt = prompts.paid
  let passed = 0

  for (const testCase of cases) {
    const routing = await routeAiConversation({
      openai,
      model,
      promptText: systemPrompt,
      history: testCase.history ?? [],
      message: testCase.message,
    })
    const context = routing.action === "search" ? await searchAiContext(routing.query!, true) : []
    let answer = routing.answer ?? "Ainda não temos um conteúdo específico sobre esse assunto. [Solicitar uma aula](/busca?sugerir=1)"

    if (routing.action === "search" && context.length > 0) {
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
    answer = finalizeAiAnswer(answer, context).answer

    const actionOk = routing.action === testCase.expectedAction
    const hrefOk = !testCase.expectedHref || context.some((item) => item.href.includes(testCase.expectedHref!))
    const noContentOk = !testCase.expectedNoContent || context.length === 0
    const normalizedQuery = normalize(routing.query ?? "")
    const queryOk = !testCase.queryTerms || testCase.queryTerms.every((term) => normalizedQuery.includes(normalize(term)))
    const noUnexpectedRetrieval = routing.action !== "respond" || context.length === 0
    const firstInternalLink = answer.match(/\]\((\/[^)]+)\)/)?.[1] ?? null
    const primaryLinkOk = !testCase.expectedHref || firstInternalLink?.includes(testCase.expectedHref) === true
    const answerOk = testCase.expectedNoContent
      ? answer.includes(AI_NO_CONTENT_MESSAGE)
      : routing.action === "respond" || !answer.includes(AI_NO_CONTENT_MESSAGE)
    const ok = actionOk && hrefOk && noContentOk && queryOk && noUnexpectedRetrieval && primaryLinkOk && answerOk
    if (ok) passed += 1

    console.log("\n============================================================")
    console.log(`[${ok ? "OK" : "FALHOU"}] ${testCase.name}`)
    console.log(`Mensagem: ${testCase.message}`)
    console.log(`Decisão: ${routing.action}${routing.query ? ` | Busca: ${routing.query}` : ""}`)
    console.log("Fontes:")
    if (context.length === 0) console.log("- nenhuma")
    for (const item of context) {
      console.log(`- [${item.source}] ${item.title} (${item.score?.toFixed(3) ?? "textual"}) -> ${item.href}`)
    }
    console.log(`Resposta:\n${answer}`)
  }

  console.log(`\nResultado: ${passed}/${cases.length} casos aprovados.`)
  if (passed !== cases.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
