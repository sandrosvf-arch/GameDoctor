import AulaClient from "./AulaClient"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AulaPage({ params }: Props) {
  const { id } = await params
  return <AulaClient lessonId={id} />
}
