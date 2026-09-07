import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  AI_RESPONSE_LIMIT_FREE_KEY,
  AI_RESPONSE_LIMIT_PAID_KEY,
  AI_MONTHLY_CREDITS_FREE_KEY,
  AI_MONTHLY_CREDITS_PAID_KEY,
  AI_SYSTEM_PROMPT_FREE_KEY,
  AI_SYSTEM_PROMPT_PAID_KEY,
  DEFAULT_AI_RESPONSE_LIMIT_FREE,
  DEFAULT_AI_RESPONSE_LIMIT_PAID,
  DEFAULT_AI_MONTHLY_CREDITS_FREE,
  DEFAULT_AI_MONTHLY_CREDITS_PAID,
} from "@/lib/ai/settings"
import { DEFAULT_AI_SYSTEM_PROMPT_FREE, DEFAULT_AI_SYSTEM_PROMPT_PAID, resolveAiSystemPrompt } from "@/lib/ai/prompt"
import {
  ABOUT_VIDEO_URL_KEY,
  APP_SETTINGS_CACHE_TAG,
  readAppSettings,
  upsertAppSettings,
  WHATSAPP_URL_KEY,
} from "@/lib/app-settings"

const revalidateTagWithProfile = revalidateTag as unknown as (
  tag: string,
  profile?: "max"
) => void

const updateSchema = z.object({
  promptFree: z.string().trim().min(20).max(12_000),
  promptPaid: z.string().trim().min(20).max(12_000),
  aboutVideoUrl: z.string().trim().url(),
  whatsappUrl: z.string().trim().url(),
  responseLimitFree: z.number().int().min(200).max(12_000),
  responseLimitPaid: z.number().int().min(200).max(12_000),
  monthlyCreditsFree: z.number().int().min(1).max(10_000),
  monthlyCreditsPaid: z.number().int().min(1).max(10_000),
})

function readIntegerSetting(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

async function requireStaff() {
  const session = await auth()
  return session && (session.user.role === "ADMIN" || session.user.role === "EDITOR")
    ? session
    : null
}

export async function GET() {
  if (!await requireStaff()) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const settings = await readAppSettings()
  const promptFreeSetting = settings.get(AI_SYSTEM_PROMPT_FREE_KEY)
  const promptPaidSetting = settings.get(AI_SYSTEM_PROMPT_PAID_KEY)
  const responseLimitFreeSetting = settings.get(AI_RESPONSE_LIMIT_FREE_KEY)
  const responseLimitPaidSetting = settings.get(AI_RESPONSE_LIMIT_PAID_KEY)

  return NextResponse.json({
    promptFree: resolveAiSystemPrompt(promptFreeSetting?.value, "FREE"),
    promptPaid: resolveAiSystemPrompt(promptPaidSetting?.value, "PAID"),
    defaultPromptFree: DEFAULT_AI_SYSTEM_PROMPT_FREE,
    defaultPromptPaid: DEFAULT_AI_SYSTEM_PROMPT_PAID,
    responseLimitFree: readIntegerSetting(responseLimitFreeSetting?.value, DEFAULT_AI_RESPONSE_LIMIT_FREE, 200, 12_000),
    responseLimitPaid: readIntegerSetting(responseLimitPaidSetting?.value, DEFAULT_AI_RESPONSE_LIMIT_PAID, 200, 12_000),
    monthlyCreditsFree: readIntegerSetting(settings.get(AI_MONTHLY_CREDITS_FREE_KEY)?.value, DEFAULT_AI_MONTHLY_CREDITS_FREE, 1, 10_000),
    monthlyCreditsPaid: readIntegerSetting(settings.get(AI_MONTHLY_CREDITS_PAID_KEY)?.value, DEFAULT_AI_MONTHLY_CREDITS_PAID, 1, 10_000),
    aboutVideoUrl:
      settings.get(ABOUT_VIDEO_URL_KEY)?.value
      || process.env.NEXT_PUBLIC_ABOUT_VIDEO_URL?.trim()
      || "https://player.vimeo.com/video/1212508404?badge=0&autopause=0&player_id=0&title=0&byline=0&portrait=0",
    whatsappUrl:
      settings.get(WHATSAPP_URL_KEY)?.value
      || process.env.NEXT_PUBLIC_SUBSCRIPTION_CANCEL_WHATSAPP_URL?.trim()
      || process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim()
      || "https://wa.me/?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20a%20GameDoctor.",
    updatedAt: (promptFreeSetting?.updatedAt ?? promptPaidSetting?.updatedAt)?.toISOString() ?? null,
  })
}

export async function PATCH(request: Request) {
  const session = await requireStaff()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    const invalidResponseLimit = parsed.error.issues.some((issue) =>
      issue.path[0] === "responseLimitFree" || issue.path[0] === "responseLimitPaid"
    )
    const invalidMonthlyLimit = parsed.error.issues.some((issue) =>
      issue.path[0] === "monthlyCreditsFree" || issue.path[0] === "monthlyCreditsPaid"
    )
    if (invalidResponseLimit) {
      return NextResponse.json({ error: "O limite de caracteres por resposta deve ficar entre 200 e 12.000." }, { status: 400 })
    }
    if (invalidMonthlyLimit) {
      return NextResponse.json({ error: "O limite mensal de perguntas deve ser um numero entre 1 e 10.000." }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Revise os prompts e informe URLs válidas para o vídeo e o WhatsApp." },
      { status: 400 }
    )
  }

  const updatedAt = await upsertAppSettings([
    { key: AI_SYSTEM_PROMPT_FREE_KEY, value: parsed.data.promptFree },
    { key: AI_SYSTEM_PROMPT_PAID_KEY, value: parsed.data.promptPaid },
    { key: AI_RESPONSE_LIMIT_FREE_KEY, value: String(parsed.data.responseLimitFree) },
    { key: AI_RESPONSE_LIMIT_PAID_KEY, value: String(parsed.data.responseLimitPaid) },
    { key: AI_MONTHLY_CREDITS_FREE_KEY, value: String(parsed.data.monthlyCreditsFree) },
    { key: AI_MONTHLY_CREDITS_PAID_KEY, value: String(parsed.data.monthlyCreditsPaid) },
    { key: ABOUT_VIDEO_URL_KEY, value: parsed.data.aboutVideoUrl },
    { key: WHATSAPP_URL_KEY, value: parsed.data.whatsappUrl },
  ])

  await db.adminLog.create({
    data: {
      adminUserId: session.user.id,
      action: "AI_PROMPT_UPDATE",
      entityType: "APP_SETTING",
      entityId: AI_SYSTEM_PROMPT_FREE_KEY,
      description: "Configurações da IA (prompts gratuito e assinante), Quem somos e WhatsApp atualizadas.",
    },
  })

  revalidateTagWithProfile(APP_SETTINGS_CACHE_TAG, "max")

  return NextResponse.json({
    promptFree: parsed.data.promptFree,
    promptPaid: parsed.data.promptPaid,
    responseLimitFree: parsed.data.responseLimitFree,
    responseLimitPaid: parsed.data.responseLimitPaid,
    monthlyCreditsFree: parsed.data.monthlyCreditsFree,
    monthlyCreditsPaid: parsed.data.monthlyCreditsPaid,
    aboutVideoUrl: parsed.data.aboutVideoUrl,
    whatsappUrl: parsed.data.whatsappUrl,
    updatedAt: updatedAt.toISOString(),
  })
}
