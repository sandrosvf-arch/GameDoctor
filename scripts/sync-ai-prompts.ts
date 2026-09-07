import fs from "node:fs/promises"
import path from "node:path"
import { AI_SYSTEM_PROMPT_FREE_KEY, AI_SYSTEM_PROMPT_PAID_KEY } from "@/lib/ai/settings"

const root = process.cwd()

const paidCompatibilityRules = `

ADENDO DE COMPATIBILIDADE COM A PLATAFORMA
- Estas regras prevalecem sobre qualquer instrucao anterior deste prompt.
- Use somente as fontes encontradas na plataforma. Nao use conhecimento geral ou informacao externa para preencher lacunas.
- Se nenhuma fonte responder, use exatamente o fallback de solicitar uma aula e nao invente uma resposta, link, valor ou politica.
- Se houver FAQ oficial validado, devolva somente o texto oficial, sem reescrever, resumir, complementar ou adicionar links.
`

async function saveAppSettings(settings: Array<{ key: string; value: string }>) {
  const supabaseUrl = process.env.SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios.")
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/app_settings?on_conflict=key`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(settings.map((setting) => ({
      key: setting.key,
      value: setting.value,
      updated_at: new Date().toISOString(),
    }))),
  })

  if (!response.ok) {
    throw new Error(`Supabase recusou a gravação (${response.status}): ${await response.text()}`)
  }
}

async function readPrompt(fileName: string) {
  const source = await fs.readFile(path.join(root, fileName), "utf8")
  const promptSection = source.split("## 2) CONTEXTO")[0]
  return promptSection.replace(/^#.*\r?\n/, "").trim()
}

function assertCompatible(name: string, prompt: string, tier: "FREE" | "PAID") {
  if (prompt.length < 20 || prompt.length > 12_000) {
    throw new Error(`${name} precisa ter entre 20 e 12.000 caracteres.`)
  }

  const normalizedPrompt = prompt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
  const required = [
    "fontes encontradas",
    "FAQ oficial",
    "Link",
    "historico",
  ]
  for (const rule of required) {
    if (!normalizedPrompt.includes(rule.toLocaleLowerCase("pt-BR"))) {
      throw new Error(`${name} nao contem a regra obrigatoria: ${rule}`)
    }
  }

  if (!normalizedPrompt.includes("nao invente")
    && !normalizedPrompt.includes("nunca complete")
    && !normalizedPrompt.includes("nunca force uma fonte")) {
    throw new Error(`${name} nao contem uma regra contra invencao de conteudo.`)
  }

  if (tier === "FREE" && !normalizedPrompt.includes("nao indique aula tecnica")) {
    throw new Error("O prompt gratuito precisa bloquear indicacao de aula tecnica.")
  }
}

async function main() {
  const paidPrompt = `${await readPrompt("prompt_gamedoctor_v3_1.md")}\n${paidCompatibilityRules.trim()}`
  const freePrompt = await readPrompt("prompt_gamedoctor_v3_1_free.md")

  assertCompatible("Prompt pago", paidPrompt, "PAID")
  assertCompatible("Prompt gratuito", freePrompt, "FREE")

  await saveAppSettings([
    { key: AI_SYSTEM_PROMPT_PAID_KEY, value: paidPrompt },
    { key: AI_SYSTEM_PROMPT_FREE_KEY, value: freePrompt },
  ])

  console.log(`Prompts sincronizados: pago=${paidPrompt.length} caracteres; gratuito=${freePrompt.length} caracteres.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
