import Link from "next/link"
import { Gamepad2, Youtube, Instagram, MessageCircle } from "lucide-react"

const footerLinks = {
  plataforma: [
    { label: "Cursos", href: "/cursos" },
    { label: "Planos", href: "/planos" },
    { label: "Entrar", href: "/login" },
    { label: "Cadastrar", href: "/cadastro" },
  ],
  suporte: [
    { label: "Fale conosco", href: "/#suporte" },
    { label: "Termos de uso", href: "/termos" },
    { label: "Privacidade", href: "/privacidade" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30 mt-20">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
                <Gamepad2 className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold text-lg">
                Game<span className="text-primary">Doctor</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Aprenda manutenção de videogames com videoaulas práticas. PlayStation, Xbox, Nintendo e muito mais.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://wa.me"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Plataforma</h3>
            <ul className="space-y-2">
              {footerLinks.plataforma.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Suporte</h3>
            <ul className="space-y-2">
              {footerLinks.suporte.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} GameDoctor. Todos os direitos reservados.</p>
          <p>Feito com dedicação para a comunidade gamer</p>
        </div>
      </div>
    </footer>
  )
}
