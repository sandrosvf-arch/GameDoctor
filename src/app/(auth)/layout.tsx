import type { ReactNode } from "react"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center p-4 py-12">
        {children}
      </main>
      <Footer />
    </div>
  )
}
