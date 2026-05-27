import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { fetchHomeRows } from "@/lib/home-rows"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const skip = Math.max(0, parseInt(searchParams.get("skip") ?? "0", 10))
  const take = Math.min(50, Math.max(1, parseInt(searchParams.get("take") ?? "10", 10)))

  try {
    const { rows } = await fetchHomeRows(skip, take)
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    })
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
