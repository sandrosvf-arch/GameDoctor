import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { Providers } from "@/components/Providers"
import { Toaster } from "@/components/ui/toaster"
import { PlatformAssistant } from "@/components/ai/PlatformAssistant"
import { DesktopScrollRail } from "@/components/layout/DesktopScrollRail"

const inter = Inter({ subsets: ["latin"] })
const googleTagManagerId = process.env.NEXT_PUBLIC_GTM_ID?.trim()

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
        {googleTagManagerId && (
          <>
            <Script id="google-tag-manager" strategy="beforeInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${googleTagManagerId}');`}
            </Script>
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(googleTagManagerId)}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
                title="Google Tag Manager"
              />
            </noscript>
          </>
        )}
        <Providers>
          {children}
          <PlatformAssistant />
          <DesktopScrollRail />
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
