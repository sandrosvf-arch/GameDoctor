import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AI_SYSTEM_PROMPT_KEY } from "@/lib/ai/settings"
import { DEFAULT_AI_SYSTEM_PROMPT, resolveAiSystemPrompt } from "@/lib/ai/prompt"
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
  prompt: z.string().trim().min(20).max(12_000),
  aboutVideoUrl: z.string().trim().url(),
  whatsappUrl: z.string().trim().url(),
})

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
  const promptSetting = settings.get(AI_SYSTEM_PROMPT_KEY)

  return NextResponse.json({
    prompt: resolveAiSystemPrompt(promptSetting?.value),
    defaultPrompt: DEFAULT_AI_SYSTEM_PROMPT,
    aboutVideoUrl:
      settings.get(ABOUT_VIDEO_URL_KEY)?.value
      || process.env.NEXT_PUBLIC_ABOUT_VIDEO_URL?.trim()
      || "https://player.vimeo.com/video/1212508404?badge=0&autopause=0&player_id=0&title=0&byline=0&portrait=0",
    whatsappUrl:
      settings.get(WHATSAPP_URL_KEY)?.value
      || process.env.NEXT_PUBLIC_SUBSCRIPTION_CANCEL_WHATSAPP_URL?.trim()
      || process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim()
      || "https://wa.me/?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20a%20GameDoctor.",
    updatedAt: promptSetting?.updatedAt.toISOString() ?? null,
  })
}

export async function PATCH(request: Request) {
  const session = await requireStaff()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revise o prompt e informe URLs válidas para o vídeo e o WhatsApp." },
      { status: 400 }
    )
  }

  const updatedAt = await upsertAppSettings([
    { key: AI_SYSTEM_PROMPT_KEY, value: parsed.data.prompt },
    { key: ABOUT_VIDEO_URL_KEY, value: parsed.data.aboutVideoUrl },
    { key: WHATSAPP_URL_KEY, value: parsed.data.whatsappUrl },
  ])

  await db.adminLog.create({
    data: {
      adminUserId: session.user.id,
      action: "AI_PROMPT_UPDATE",
      entityType: "APP_SETTING",
      entityId: AI_SYSTEM_PROMPT_KEY,
      description: "Configurações da IA, Quem somos e WhatsApp atualizadas.",
    },
  })

  revalidateTagWithProfile(APP_SETTINGS_CACHE_TAG, "max")

  return NextResponse.json({
    prompt: parsed.data.prompt,
    aboutVideoUrl: parsed.data.aboutVideoUrl,
    whatsappUrl: parsed.data.whatsappUrl,
    updatedAt: updatedAt.toISOString(),
  })
}
