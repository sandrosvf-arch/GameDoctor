import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/Providers"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "GameDoctor",
    template: "%s | GameDoctor",
  },
  description:
    "Aprenda manutenção de videogames com videoaulas práticas do GameDoctor. PlayStation, Xbox, Nintendo, solda, eletrônica e muito mais.",
  keywords: [
    "manutenção de videogames",
    "conserto de videogame",
    "curso de manutenção",
    "GameDoctor",
    "PlayStation",
    "Xbox",
    "Nintendo",
    "solda eletrônica",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "GameDoctor",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
