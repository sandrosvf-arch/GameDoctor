import { NextResponse } from "next/server"
import OpenAI from "openai"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { consumeAiCredit, getAiUsageStatus, resolveAiAccess } from "@/lib/ai/access"
import { buildAiSystemPrompt } from "@/lib/ai/prompt"
import { getAiSystemPrompt } from "@/lib/ai/settings"
import { searchAiContext } from "@/lib/ai/search"

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  conversationId: z.string().cuid().nullable().optional(),
})

const model = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini"

// Strips any domain/protocol the model might hallucinate in front of internal links, e.g. "gamedoctor.com/aula/..." -> "/aula/..."
function stripLinkDomains(text: string) {
  return text.replace(/\]\((?:https?:\/\/)?(?:www\.)?[^\/\s)]+(\/[^)]*)\)/g, "]($1)")
}

function getOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  return apiKey ? new OpenAI({ apiKey }) : null
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para conversar com o assistente.", requiresAuth: true }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Envie uma mensagem válida de até 4.000 caracteres." }, { status: 400 })
  }

  const openai = getOpenAiClient()
  if (!openai) {
    return NextResponse.json({ error: "O assistente ainda não está configurado." }, { status: 503 })
  }

  const access = await resolveAiAccess(session.user.id, session.user.role)
  if (parsed.data.message.length > access.maxMessageCharacters) {
    return NextResponse.json({
      error: `Sua mensagem pode ter no máximo ${access.maxMessageCharacters.toLocaleString("pt-BR")} caracteres.`,
    }, { status: 400 })
  }

  const usageBefore = await getAiUsageStatus(session.user.id, access)
  if (usageBefore.creditsRemaining < 1) {
    return NextResponse.json({
      error: "Você atingiu o limite mensal do assistente.",
      usage: usageBefore,
    }, { status: 429 })
  }

  let conversationId = parsed.data.conversationId ?? null
  if (conversationId) {
    const conversation = await db.aiConversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
      select: { id: true },
    })
    if (!conversation) {
      return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 })
    }
  }

  const history = conversationId
    ? await db.aiMessage.findMany({
        where: { conversationId, userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { role: true, content: true },
      })
    : []

  const context = await searchAiContext(parsed.data.message)
  const systemPrompt = await getAiSystemPrompt()
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: buildAiSystemPrompt(systemPrompt, access, context) },
      ...history.reverse().map((item) => ({
        role: item.role === "USER" ? "user" as const : "assistant" as const,
        content: item.content,
      })),
      { role: "user", content: parsed.data.message },
    ],
    temperature: 0.3,
    max_tokens: 600,
  })

  const answer = completion.choices[0]?.message?.content?.trim()
  if (!answer) {
    return NextResponse.json({ error: "O assistente não retornou uma resposta." }, { status: 502 })
  }

  const sanitizedAnswer = stripLinkDomains(answer)

  const usage = await consumeAiCredit(session.user.id, access)
  const inputTokens = completion.usage?.prompt_tokens ?? null
  const outputTokens = completion.usage?.completion_tokens ?? null

  if (!conversationId) {
    const conversation = await db.aiConversation.create({
      data: {
        userId: session.user.id,
        title: parsed.data.message.slice(0, 80),
      },
      select: { id: true },
    })
    conversationId = conversation.id
  }

  await db.$transaction([
    db.aiMessage.create({
      data: {
        conversationId,
        userId: session.user.id,
        role: "USER",
        content: parsed.data.message,
        credits: 0,
      },
    }),
    db.aiMessage.create({
      data: {
        conversationId,
        userId: session.user.id,
        role: "ASSISTANT",
        content: sanitizedAnswer,
        model,
        inputTokens,
        outputTokens,
        credits: 1,
      },
    }),
    db.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ])

  return NextResponse.json({
    conversationId,
    answer: sanitizedAnswer,
    sources: context.map(({ title, href, source }) => ({ title, href, source })),
    usage,
  })
}
