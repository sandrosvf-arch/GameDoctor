import Link from "next/link"
import Image from "next/image"
import { Youtube, Instagram, MessageCircle } from "lucide-react"

const footerLinks = {
  plataforma: [
    { label: "Trilhas", href: "/cursos" },
    { label: "Planos", href: "/planos" },
    { label: "Comunidade", href: "/comunidade" },
  ],
  suporte: [
    { label: "Quem somos", href: "/quem-somos" },
    { label: "Dúvidas frequentes", href: "/suporte" },
    { label: "Fale conosco", href: "/contato" },
    { label: "Termos de uso", href: "/termos-de-uso" },
    { label: "Privacidade", href: "/politica-privacidade" },
  ],
}

const socialLinks = [
  { label: "YouTube", href: "https://youtube.com", Icon: Youtube },
  { label: "Instagram", href: "https://instagram.com", Icon: Instagram },
  { label: "WhatsApp", href: "https://wa.me", Icon: MessageCircle },
]

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30 mt-20">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/doctor-oficial.png"
                alt="GameDoctor"
                width={240}
                height={48}
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Aprenda manutenção de videogames com videoaulas práticas. PlayStation, Xbox, Nintendo e muito mais.
            </p>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Acompanhe nossas redes
              </p>
              <div className="flex items-center gap-3">
                {socialLinks.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
                    aria-label={label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
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
          <p className="text-center sm:text-right">Feito com dedicação para a comunidade gamer · by MGU + Maxtech</p>
        </div>
      </div>
    </footer>
  )
}
