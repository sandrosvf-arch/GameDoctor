import OpenAI from "openai"
import { buildAiSystemPrompt } from "../src/lib/ai/prompt"
import { searchAiContext } from "../src/lib/ai/search"
import { getAiSystemPrompts } from "../src/lib/ai/settings"

const model = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini"
const apiKey = process.env.OPENAI_API_KEY?.trim()
if (!apiKey) throw new Error("OPENAI_API_KEY não configurada.")

const openai = new OpenAI({ apiKey })
const access = {
  tier: "PAID" as const,
  monthlyCredits: 100,
  technicalMode: true,
  maxMessageCharacters: 2_000,
}

const cases = [
  {
    question: "Como faço o desbloqueio de um Xbox clássico com placa 1.6 usando Modxo e FATXplorer?",
    expected: "66915432-83f3-4be9-90fc-3ff514dcc292",
  },
  {
    question: "O analógico do meu controle Xbox Series ficou fora do centro. Existe calibração por software?",
    expected: "5525e25f-9afb-4d64-a824-516603e3b075",
  },
  {
    question: "Meu PS4 apresenta o erro CE-34878-0. A plataforma explica esse defeito e suas variantes?",
    expected: "14df535a-89bb-4e2f-9a48-39892f1ecff1",
  },
  {
    question: "Qual temperatura usar na estação de ar para fazer retrabalho BGA?",
    expected: "e4fcf45c-5177-4484-803e-9124360798ad",
  },
  {
    question: "Tem aula ensinando a reparar uma torradeira industrial?",
    expected: null,
  },
  {
    question: "Na comunidade alguém comentou sobre um PS5 que liga, fica poucos segundos ligado e desliga sozinho?",
    expected: "51654ca9-9b4e-47ed-9c37-5972f4c024c9",
  },
  {
    question: "Onde está o tópico para perguntar, tirar dúvidas, conversar e respeitar as regras?",
    expected: "duvidas-discussoes-e-bate-papo",
  },
]

async function main() {
  const prompts = await getAiSystemPrompts()
  const systemPrompt = prompts.paid

  for (const testCase of cases) {
    const context = await searchAiContext(testCase.question, true)
    let answer = "Ainda não temos um conteúdo específico sobre esse assunto. [Solicitar uma aula](/busca?sugerir=1)"
    if (context.length > 0) {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: buildAiSystemPrompt(systemPrompt, context) },
          { role: "user", content: testCase.question },
        ],
        temperature: 0,
        max_tokens: 450,
      })
      answer = completion.choices[0]?.message?.content?.trim() || "SEM RESPOSTA"
    }

    answer = answer
      .replace(/\]\(\s*(?:https?:\/\/)?(?:www\.)?[^\/\s)]+(\/[^)]*)\)/g, "]($1)")
      .replace(/\]\(\s+(\/[^)]*)\)/g, "]($1)")
    if (context.length > 0
      && !answer.includes("Ainda não temos um conteúdo específico sobre esse assunto.")
      && !answer.includes(`](${context[0].href})`)) {
      answer += `\n\nConteúdo principal: [${context[0].title}](${context[0].href})`
    }

    const matchedExpected = testCase.expected
      ? context.some((item) => item.href.includes(testCase.expected!))
      : answer.includes("Ainda não temos um conteúdo específico") && answer.includes("/busca?sugerir=1")

    console.log("\n============================================================")
    console.log(`Pergunta: ${testCase.question}`)
    console.log(`Recuperação esperada: ${matchedExpected ? "OK" : "FALHOU"}`)
    console.log("Fontes:")
    for (const item of context) console.log(`- [${item.source}] ${item.title} (${item.score?.toFixed(3) ?? "textual"}) -> ${item.href}`)
    console.log(`Resposta:\n${answer}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
