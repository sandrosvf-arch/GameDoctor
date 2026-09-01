import assert from "node:assert/strict"
import { buildAiSystemPrompt, DEFAULT_AI_SYSTEM_PROMPT_PAID, resolveAiSystemPrompt } from "../src/lib/ai/prompt"

const context = [{
  title: "Erro E100",
  text: "Verifique a alimentação do equipamento.",
  href: "/aula/erro-e100",
  source: "lesson" as const,
}]

assert.equal(resolveAiSystemPrompt("  ", "PAID"), DEFAULT_AI_SYSTEM_PROMPT_PAID)

const prompt = buildAiSystemPrompt("Responda como um professor paciente.", context)
assert.match(prompt, /^Responda como um professor paciente\./)
assert.match(prompt, /Erro E100/)
assert.match(prompt, /\/aula\/erro-e100/)

console.log("Montagem do prompt configurável aprovada.")

