import { Header } from "@/components/layout/Header"
import { PlatformAssistant } from "@/components/ai/PlatformAssistant"

export default function AssistantPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <div className="mx-auto max-w-4xl px-4 pt-8 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">GameDoctor</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Fale com nossa IA</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Tire dúvidas sobre as trilhas, encontre aulas e avance no seu aprendizado com orientação da plataforma.
          </p>
        </div>
        <PlatformAssistant page />
      </main>
    </div>
  )
}