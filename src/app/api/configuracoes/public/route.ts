import { NextResponse } from "next/server"
import { getPublicPlatformSettings } from "@/lib/app-settings"

export async function GET() {
  const { whatsappUrl } = await getPublicPlatformSettings()

  return NextResponse.json(
    { whatsappUrl },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  )
}
