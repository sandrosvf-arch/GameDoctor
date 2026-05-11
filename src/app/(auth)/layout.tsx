import type { ReactNode } from "react"
import Link from "next/link"
import { Gamepad2 } from "lucide-react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Gamepad2 className="h-5 w-5 text-primary" />
          Game<span className="text-primary">Doctor</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4">
        © {new Date().getFullYear()} GameDoctor. Todos os direitos reservados.
      </footer>
    </div>
  )
}
