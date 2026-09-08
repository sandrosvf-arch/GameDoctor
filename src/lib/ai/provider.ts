import OpenAI from "openai"

export type AiProviderName = "anthropic" | "openai"

export type AiProviderMessage = {
  role: "user" | "assistant"
  content: string
}

export type AiProviderCompletion = {
  content: string | null
  inputTokens: number | null
  outputTokens: number | null
}

export type AiProviderCompletionInput = {
  system: string
  messages: AiProviderMessage[]
  temperature?: number
  maxTokens: number
  jsonSchema?: { name: string; schema: Record<string, unknown> }
}

export type AiProvider = {
  name: AiProviderName
  model: string
  complete(input: AiProviderCompletionInput): Promise<AiProviderCompletion>
}

const ANTHROPIC_VERSION = "2023-06-01"

function getProviderName(): AiProviderName {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase()
  if (!configured || configured === "anthropic") return "anthropic"
  if (configured === "openai") return "openai"
  throw new Error(`AI_PROVIDER inválido: ${configured}. Use anthropic ou openai.`)
}

function getModel(name: AiProviderName) {
  return name === "anthropic"
    ? process.env.ANTHROPIC_CHAT_MODEL?.trim() || "claude-sonnet-4-20250514"
    : process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini"
}

function getRequiredKey(name: AiProviderName) {
  const key = name === "anthropic"
    ? process.env.ANTHROPIC_API_KEY?.trim()
    : process.env.OPENAI_API_KEY?.trim()

  return key || null
}

function buildJsonInstruction(jsonSchema: AiProviderCompletionInput["jsonSchema"]) {
  if (!jsonSchema) return ""
  return `\nRetorne somente JSON válido, sem markdown e sem texto antes ou depois. O formato obrigatório é: ${JSON.stringify(jsonSchema.schema)}`
}

async function completeAnthropic(
  model: string,
  apiKey: string,
  input: AiProviderCompletionInput,
): Promise<AiProviderCompletion> {
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim()
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      ...(workspaceId ? { "anthropic-workspace-id": workspaceId } : {}),
    },
    body: JSON.stringify({
      model,
      system: `${input.system}${buildJsonInstruction(input.jsonSchema)}`,
      messages: input.messages,
      temperature: input.temperature ?? 0,
      max_tokens: input.maxTokens,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "")
    throw new Error(`Anthropic (${response.status}): ${errorBody.slice(0, 300)}`)
  }

  const payload = await response.json() as {
    content?: Array<{ type?: string; text?: string }>
    usage?: { input_tokens?: number; output_tokens?: number }
  }

  return {
    content: payload.content?.find((block) => block.type === "text")?.text?.trim() ?? null,
    inputTokens: payload.usage?.input_tokens ?? null,
    outputTokens: payload.usage?.output_tokens ?? null,
  }
}

async function completeOpenAi(
  model: string,
  apiKey: string,
  input: AiProviderCompletionInput,
): Promise<AiProviderCompletion> {
  const openai = new OpenAI({ apiKey })
  const messages = [
    { role: "system" as const, content: `${input.system}${buildJsonInstruction(input.jsonSchema)}` },
    ...input.messages,
  ]
  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature: input.temperature ?? 0,
    max_tokens: input.maxTokens,
    ...(input.jsonSchema
      ? {
          response_format: {
            type: "json_schema" as const,
            json_schema: {
              name: input.jsonSchema.name,
              strict: true,
              schema: input.jsonSchema.schema,
            },
          },
        }
      : {}),
  })

  return {
    content: completion.choices[0]?.message?.content?.trim() ?? null,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
  }
}

export function getAiProvider(): AiProvider | null {
  const name = getProviderName()
  const apiKey = getRequiredKey(name)
  if (!apiKey) return null

  const model = getModel(name)
  return {
    name,
    model,
    complete: (input) => name === "anthropic"
      ? completeAnthropic(model, apiKey, input)
      : completeOpenAi(model, apiKey, input),
  }
}
