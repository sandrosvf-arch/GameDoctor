/**
 * GET /api/bunny/preview-embed?lessonId=[id]
 *
 * Retorna somente o clipe de prévia configurado na aula. O vídeo completo
 * nunca é assinado por esta rota.
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { hasAccessToLesson } from "@/lib/access"
import { bunnySignedEmbedUrl } from "@/lib/bunny"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lessonId = searchParams.get("lessonId")?.trim()

  if (!lessonId) {
    return NextResponse.json({ error: "LESSON_ID_REQUIRED" }, { status: 400 })
  }

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      status: true,
      previewEnabled: true,
      previewVideoProviderId: true,
    },
  })

  if (!lesson || lesson.status !== "PUBLISHED") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  const session = await auth()
  const access = await hasAccessToLesson(
    session?.user?.id ?? null,
    lesson.id,
    {
      isStaff:
        session?.user?.role === "ADMIN" ||
        session?.user?.role === "EDITOR",
    }
  )

  if (access.isReleaseLocked) {
    return NextResponse.json(
      { error: "RELEASE_LOCKED", releaseAt: access.releaseAt },
      { status: 403 }
    )
  }

  if (access.hasAccess && !access.isPreview) {
    return NextResponse.json({ error: "ALREADY_ACCESSIBLE" }, { status: 403 })
  }

  if (
    !lesson.previewEnabled ||
    !access.isPreview ||
    !lesson.previewVideoProviderId
  ) {
    return NextResponse.json({ error: "PREVIEW_UNAVAILABLE" }, { status: 404 })
  }

  const response = NextResponse.json({
    embedUrl: bunnySignedEmbedUrl(
      lesson.previewVideoProviderId,
      15 * 60,
      { autoplay: false, muted: false }
    ),
  })

  response.headers.set("Cache-Control", "private, no-store, max-age=0")
  return response
}
