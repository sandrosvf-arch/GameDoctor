import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"

export const APP_SETTINGS_CACHE_TAG = "app-settings"
export const ABOUT_VIDEO_URL_KEY = "about.video_url"
export const WHATSAPP_URL_KEY = "contact.whatsapp_url"
export const CERTIFICATE_TEMPLATE_KEY = "certificate.template"

const DEFAULT_ABOUT_VIDEO_URL =
  "https://player.vimeo.com/video/1212508404?badge=0&autopause=0&player_id=0&title=0&byline=0&portrait=0"
const DEFAULT_WHATSAPP_URL =
  "https://wa.me/?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20a%20GameDoctor."

type AppSettingRow = {
  key: string
  value: string
  updatedAt: Date
}

export async function readAppSettings() {
  const rows = await db.$queryRaw<AppSettingRow[]>`
    SELECT "key", "value", "updated_at" AS "updatedAt"
    FROM "app_settings"
  `

  return new Map(rows.map((row) => [row.key, row]))
}

const readCachedAppSettings = unstable_cache(
  async () => Array.from((await readAppSettings()).values()),
  ["app-settings"],
  { revalidate: 300, tags: [APP_SETTINGS_CACHE_TAG] }
)

export async function getPublicPlatformSettings() {
  const settings = new Map((await readCachedAppSettings()).map((row) => [row.key, row]))

  return {
    aboutVideoUrl:
      settings.get(ABOUT_VIDEO_URL_KEY)?.value.trim()
      || process.env.NEXT_PUBLIC_ABOUT_VIDEO_URL?.trim()
      || DEFAULT_ABOUT_VIDEO_URL,
    whatsappUrl:
      settings.get(WHATSAPP_URL_KEY)?.value.trim()
      || process.env.NEXT_PUBLIC_SUBSCRIPTION_CANCEL_WHATSAPP_URL?.trim()
      || process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim()
      || DEFAULT_WHATSAPP_URL,
  }
}

export async function upsertAppSettings(
  settings: Array<{ key: string; value: string }>
) {
  const updatedAt = new Date()

  for (const setting of settings) {
    await db.$executeRaw`
      INSERT INTO "app_settings" ("key", "value", "updated_at")
      VALUES (${setting.key}, ${setting.value}, ${updatedAt})
      ON CONFLICT ("key") DO UPDATE
      SET "value" = EXCLUDED."value", "updated_at" = EXCLUDED."updated_at"
    `
  }

  return updatedAt
}
