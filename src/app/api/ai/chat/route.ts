import { NextResponse } from "next/server"
import OpenAI from "openai"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { consumeAiCredit, getAiUsageStatus, resolveAiAccess } from "@/lib/ai/access"
import { AI_NO_CONTENT_MESSAGE, buildAiSystemPrompt, finalizeAiAnswer } from "@/lib/ai/prompt"
import { getAiSystemPrompts } from "@/lib/ai/settings"
import { searchAiContext } from "@/lib/ai/search"
import { routeAiConversation } from "@/lib/ai/router"

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  conversationId: z.string().cuid().nullable().optional(),
})

const model = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini"

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

  const prompts = await getAiSystemPrompts()
  const systemPrompt = access.tier === "FREE" ? prompts.free : prompts.paid
  const responseLimit = access.tier === "FREE" ? prompts.responseLimitFree : prompts.responseLimitPaid
  const conversationHistory = history.reverse().map((item) => ({
    role: item.role === "USER" ? "user" as const : "assistant" as const,
    content: item.content,
  }))
  const routing = await routeAiConversation({
    openai,
    model,
    promptText: systemPrompt,
    history: conversationHistory,
    message: parsed.data.message,
  })
  const context = routing.action === "search"
    ? await searchAiContext(routing.query!, access.technicalMode)
    : []
  const suggestionHref = `/busca?sugerir=1&q=${encodeURIComponent(routing.query ?? parsed.data.message)}`
  let answer = routing.answer
    ?? `${AI_NO_CONTENT_MESSAGE} Você pode [solicitar uma aula](${suggestionHref}) para nossa equipe.`
  let responseModel: string | null = model
  let inputTokens: number | null = routing.inputTokens
  let outputTokens: number | null = routing.outputTokens
  let credits = 0
  let usage = usageBefore
  const faqContext = context[0]?.source === "help" ? context[0] : null

  if (faqContext) {
    // FAQs are official answers and must not be rewritten by the model.
    answer = faqContext.text
    credits = 1
    usage = await consumeAiCredit(session.user.id, access)
  } else if (context.length > 0) {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: buildAiSystemPrompt(systemPrompt, context) },
        ...conversationHistory,
        { role: "user", content: parsed.data.message },
      ],
      temperature: 0.2,
      max_tokens: Math.max(200, Math.ceil(responseLimit / 3)),
    })

    const completionAnswer = completion.choices[0]?.message?.content?.trim()
    if (!completionAnswer) {
      return NextResponse.json({ error: "O assistente não retornou uma resposta." }, { status: 502 })
    }

    answer = completionAnswer
    responseModel = model
    inputTokens = (inputTokens ?? 0) + (completion.usage?.prompt_tokens ?? 0)
    outputTokens = (outputTokens ?? 0) + (completion.usage?.completion_tokens ?? 0)
    credits = 1
    usage = await consumeAiCredit(session.user.id, access)
  }

  const finalized = faqContext
    ? { answer, hasNoContent: false }
    : finalizeAiAnswer(answer.slice(0, responseLimit), context)
  const sanitizedAnswer = finalized.answer
  const hasNoContent = finalized.hasNoContent

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
        model: responseModel,
        inputTokens,
        outputTokens,
        credits,
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
    sources: hasNoContent ? [] : context.map(({ title, href, source }) => ({ title, href, source })),
    usage,
  })
}
