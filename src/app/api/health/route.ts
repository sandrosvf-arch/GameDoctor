import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const count = await db.course.count()
    const url = process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ":***@") ?? "not set"
    return NextResponse.json({ ok: true, courseCount: count, dbUrlPrefix: url.substring(0, 50) })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      dbUrlSet: !!process.env.DATABASE_URL,
    })
  }
}
