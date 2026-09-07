import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { buildAiSystemPrompt, finalizeAiAnswer, AI_NO_CONTENT_MESSAGE } from "../src/lib/ai/prompt"
import type { AiContextItem } from "../src/lib/ai/search"

interface KnowledgeDocument {
  file: string
  title: string
  content: string
}

interface Scenario {
  name: string
  question: string
  expectedFile: string
  expectedTerms: string[]
}

interface ConversationScenario {
  name: string
  turns: Array<{ message: string; expectedFile: string; expectedTerms: string[] }>
}

const STOP_WORDS = new Set([
  "com", "como", "para", "que", "uma", "meu", "minha", "tem", "aula", "sobre", "está", "esta",
  "não", "nao", "qual", "quais", "onde", "depois", "isso", "esse", "essa", "meu", "minha",
])

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function terms(value: string) {
  return Array.from(new Set(normalize(value).split(" ").filter((term) => term.length >= 3 && !STOP_WORDS.has(term))))
}

function jsonTitle(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback
  const record = value as Record<string, unknown>
  for (const key of ["titulo", "title", "nome", "name", "arquivo"]) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key].trim()
  }
  return fallback
}

function jsonText(value: unknown, label = ""): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return label ? `${label}: ${String(value)}` : String(value)
  }
  if (Array.isArray(value)) return value.map((item) => jsonText(item)).filter(Boolean).join("\n")
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !["embedding", "vector"].includes(key.toLowerCase()))
      .map(([key, item]) => jsonText(item, key))
      .filter(Boolean)
      .join("\n")
  }
  return ""
}

async function listJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listJsonFiles(file))
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) files.push(file)
  }
  return files
}

async function loadDocuments() {
  const root = path.resolve(process.cwd(), "knowledgebase")
  const files = await listJsonFiles(root)
  const documents: KnowledgeDocument[] = []

  for (const file of files) {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"))
    const values = Array.isArray(parsed) ? parsed : [parsed]
    const relative = path.relative(root, file).replaceAll(path.sep, "/")

    values.forEach((value, index) => {
      const content = jsonText(value).trim()
      if (!content) return
      const fallback = relative.replace(/\.json$/i, "")
      documents.push({
        file: relative,
        title: values.length > 1 ? `${jsonTitle(value, fallback)} (${index + 1})` : jsonTitle(value, fallback),
        content,
      })
    })
  }

  return documents
}

function findBestDocument(documents: KnowledgeDocument[], question: string) {
  const questionTerms = terms(question)
  return documents
    .map((document) => {
      const haystack = normalize(`${document.title} ${document.content}`)
      const matched = questionTerms.filter((term) => haystack.includes(term))
      const titleText = normalize(document.title)
      const titleMatches = questionTerms.filter((term) => titleText.includes(term))
      const exactCode = questionTerms.some((term) => /\d/.test(term) && haystack.includes(term))
      return { document, score: matched.length + titleMatches.length * 4 + (exactCode ? 5 : 0), matched }
    })
    .sort((left, right) => right.score - left.score)[0]
}

const scenarios: Scenario[] = [
  {
    name: "código de erro exato",
    question: "Meu PS4 está com o erro SU-42118-6, o que devo conferir?",
    expectedFile: "03_conteudo/erros/erros_ps4.json",
    expectedTerms: ["SU-42118-6", "flat", "drive"],
  },
  {
    name: "diagnóstico resumido",
    question: "ps4 reinicia em loop depois do update",
    expectedFile: "03_conteudo/erros/erros_ps4.json",
    expectedTerms: ["update", "drive"],
  },
  {
    name: "erro de armazenamento",
    question: "PS4 não detecta o HD, tem orientação?",
    expectedFile: "03_conteudo/erros/erros_ps4.json",
    expectedTerms: ["CE-34335-8", "HDD", "SATA"],
  },
  {
    name: "Xbox escrito sem acento",
    question: "xbox 360 nao liga e fica piscano",
    expectedFile: "03_conteudo/erros/erros_x360.json",
    expectedTerms: ["Console", "Causa", "Acao"],
  },
  {
    name: "Nintendo abreviado",
    question: "switch n carrega",
    expectedFile: "03_conteudo/erros/erros_switch.json",
    expectedTerms: ["Switch", "carrega"],
  },
  {
    name: "PS5 sem imagem",
    question: "PS5 liga mas não aparece imagem",
    expectedFile: "03_conteudo/erros/erros_ps5.json",
    expectedTerms: ["PS5", "imagem"],
  },
  {
    name: "PS4 update pelo recovery",
    question: "Meu PS4 da SU-30746-0 quando tento atualizar, como comeco o diagnostico?",
    expectedFile: "03_conteudo/erros/erros_ps4.json",
    expectedTerms: ["SU-30746-0", "recovery", "USB"],
  },
  {
    name: "PS4 crash em jogo",
    question: "PS4 fecha os jogos com o erro CE-34878-0, o que testar primeiro?",
    expectedFile: "03_conteudo/erros/erros_ps4.json",
    expectedTerms: ["CE-34878-0", "HDD", "Rebuild"],
  },
  {
    name: "Xbox One sem energia",
    question: "xbox one mostra o erro 0xE001, o que verifico na fonte?",
    expectedFile: "03_conteudo/erros/erros_xbox_one.json",
    expectedTerms: ["0xE001", "Southbridge"],
  },
  {
    name: "Xbox Series liga e desliga",
    question: "series s liga e desliga na hora, tem como orientar a bancada?",
    expectedFile: "03_conteudo/erros/erros_xbox_series.json",
    expectedTerms: ["Xbox", "liga", "desliga"],
  },
  {
    name: "Switch sem imagem",
    question: "switch mostra o erro 2168-0002, como diagnostico?",
    expectedFile: "03_conteudo/erros/erros_switch.json",
    expectedTerms: ["2168-0002", "FAT32"],
  },
  {
    name: "Esquema de fonte PS4",
    question: "onde encontro o esquema da fonte ADP-200ER do PS4?",
    expectedFile: "03_conteudo/mapas_e_esquemas/acervo_txd/txd_ps4_fonte__adp200er_aa_stby.json",
    expectedTerms: ["ADP", "STBY"],
  },
  {
    name: "Pergunta curta de bancada",
    question: "PS4 apresenta o erro CE-34335-8, o HD nao e reconhecido?",
    expectedFile: "03_conteudo/erros/erros_ps4.json",
    expectedTerms: ["HDD", "SATA"],
  },
  {
    name: "Erro digitado sem acento",
    question: "meu ps4 reinicia no update e nao le o drive",
    expectedFile: "03_conteudo/erros/erros_ps4.json",
    expectedTerms: ["update", "drive"],
  },
  {
    name: "assunto fora da base",
    question: "como consertar uma torradeira industrial",
    expectedFile: "__none__",
    expectedTerms: [],
  },
]

const conversations: ConversationScenario[] = [
  {
    name: "PS4 em etapas",
    turns: [
      { message: "Meu PS4 esta com erro SU-42118-6", expectedFile: "03_conteudo/erros/erros_ps4.json", expectedTerms: ["SU-42118-6"] },
      { message: "ele fica reiniciando depois do update", expectedFile: "03_conteudo/erros/erros_ps4.json", expectedTerms: ["update", "drive"] },
      { message: "e se o flat estiver bom?", expectedFile: "03_conteudo/erros/erros_ps4.json", expectedTerms: ["Renesas", "drive"] },
    ],
  },
  {
    name: "Switch resumido",
    turns: [
      { message: "switch n carrega", expectedFile: "03_conteudo/erros/erros_switch.json", expectedTerms: ["Switch", "carrega"] },
      { message: "ja troquei o carregador, e agora?", expectedFile: "03_conteudo/erros/erros_switch.json", expectedTerms: ["carrega"] },
    ],
  },
]

async function main() {
  const documents = await loadDocuments()
  const failures: string[] = []

  for (const scenario of scenarios) {
    const result = findBestDocument(documents, scenario.question)
    const shouldFind = scenario.expectedFile !== "__none__"
    const foundExpectedFile = result?.document.file === scenario.expectedFile
    const content = normalize(result?.document.content ?? "")
    const termsPresent = scenario.expectedTerms.every((term) => content.includes(normalize(term)))
    const hasRelevantMatch = (result?.score ?? 0) >= 4
    const unexpectedExternalMatch = !shouldFind && hasRelevantMatch

    if ((shouldFind && (!hasRelevantMatch || !foundExpectedFile || !termsPresent)) || unexpectedExternalMatch) {
      failures.push(`${scenario.name}: esperado=${scenario.expectedFile}, encontrado=${result?.document.file ?? "nenhum"}`)
      continue
    }

    if (shouldFind) {
      const context: AiContextItem = {
        source: "lesson",
        title: result.document.title,
        text: result.document.content,
        href: "/cursos",
        score: 0.9,
      }
      const groundedPrompt = buildAiSystemPrompt("Responda apenas com base nas fontes.", [context])
      const groundedAnswer = finalizeAiAnswer(AI_NO_CONTENT_MESSAGE, [context]).answer
      if (!groundedPrompt.includes(result.document.content) || !groundedAnswer.includes("/cursos")) {
        failures.push(`${scenario.name}: conteúdo não chegou ao prompt ou não gerou link de origem`)
      }
    }
  }

  for (const conversation of conversations) {
    let previousMessages = ""
    for (const turn of conversation.turns) {
      const result = findBestDocument(documents, `${previousMessages} ${turn.message}`)
      const content = normalize(result?.document.content ?? "")
      const termsPresent = turn.expectedTerms.every((term) => content.includes(normalize(term)))
      if (result?.document.file !== turn.expectedFile || (result?.score ?? 0) < 4 || !termsPresent) {
        failures.push(`${conversation.name} / ${turn.message}: esperado=${turn.expectedFile}, encontrado=${result?.document.file ?? "nenhum"}`)
      }
      previousMessages += ` ${turn.message}`
    }
  }

  console.log(`${documents.length} documento(s) JSON carregado(s).`)
  const totalChecks = scenarios.length + conversations.reduce((total, conversation) => total + conversation.turns.length, 0)
  console.log(`${totalChecks - failures.length}/${totalChecks} cenários aprovados.`)
  if (failures.length > 0) {
    console.error(failures.join("\n"))
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
