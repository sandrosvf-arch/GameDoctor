import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { bunnyEmbedUrl } from "@/lib/bunny"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  MessageSquare,
  Play,
  User2,
} from "lucide-react"

interface Props {
  params: Promise<{ videoId: string }>
  searchParams: Promise<{ titulo?: string; legenda?: string }>
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m} min ${s}s` : `${m} min`
}

async function getBunnyVideo(videoId: string) {
  try {
    const res = await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: { AccessKey: process.env.BUNNY_STREAM_API_KEY ?? "" },
        next: { revalidate: 3600 },
      }
    )
    if (!res.ok) return null
    return await res.json() as { title: string; length: number }
  } catch {
    return null
  }
}

export default async function BunnyAulaPage({ params, searchParams }: Props) {
  const { videoId } = await params
  const { titulo, legenda } = await searchParams

  const meta = await getBunnyVideo(videoId)
  const title = titulo ?? meta?.title?.replace(/\.mp4$/i, "") ?? "Aula"
  const duration = meta?.length ? formatDuration(meta.length) : null
  const embedUrl = bunnyEmbedUrl(videoId)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-border/50 bg-muted/30">
        <div className="container flex items-center gap-2 h-10 text-sm text-muted-foreground">
          <Link href="/cursos" className="hover:text-foreground transition-colors">
            Cursos
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground truncate max-w-[300px]">{title}</span>
        </div>
      </div>

      <div className="container py-6">
        <div className="flex gap-6 items-start">

          {/* ── Main column ── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Video player */}
            <div
              className="relative w-full rounded-xl overflow-hidden bg-black shadow-xl"
              style={{ aspectRatio: "16/9" }}
            >
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={title}
              />
            </div>

            {/* Title + actions */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-snug">{title}</h1>
                <div className="flex items-center gap-3 mt-1">
                  {duration && (
                    <span className="text-sm text-muted-foreground">{duration}</span>
                  )}
                  {legenda && (
                    <span className="text-sm text-muted-foreground">{legenda}</span>
                  )}
                  <span className="text-xs bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Gratuito
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Início
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/cursos">
                    Ver mais aulas
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Comments placeholder */}
            <div>
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Comentários
              </h2>
              <div className="flex gap-3 mb-6">
                <div className="shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  <User2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <textarea
                    placeholder="Deixe sua dúvida ou comentário..."
                    rows={3}
                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="flex justify-end mt-2">
                    <Button size="sm" asChild>
                      <Link href="/login">Entrar para comentar</Link>
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center py-6">
                Seja o primeiro a comentar nesta aula.
              </p>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 sticky top-20 max-h-[calc(100vh-5rem)] rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Conteúdo do curso
              </p>
              <p className="text-sm font-semibold mt-0.5">Início da Jornada</p>
            </div>
            <div className="overflow-y-auto flex-1">
              <div className="flex items-start gap-3 px-4 py-2.5 text-sm bg-primary/10 text-primary border-l-2 border-primary">
                <Play className="h-4 w-4 fill-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate leading-snug">{title}</p>
                  {duration && (
                    <p className="text-xs text-muted-foreground mt-0.5">{duration}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 px-4 py-2.5 text-sm text-muted-foreground border-l-2 border-transparent opacity-50">
                <Circle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate leading-snug">Próximas aulas em breve...</p>
                </div>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  )
}

