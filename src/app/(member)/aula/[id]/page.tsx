import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import AulaClient from "./AulaClient"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AulaPage({ params }: Props) {
  const { id } = await params

  const lesson = await db.lesson.findUnique({
    where: { id },
    select: { videoProviderId: true },
  })

  if (lesson?.videoProviderId) {
    redirect(`/aula/bunny/${lesson.videoProviderId}`)
  }

  return <AulaClient lessonId={id} />
}
