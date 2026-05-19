import { Loader2 } from "lucide-react"
import { Header } from "@/components/layout/Header"

export default function BunnyAulaLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  )
}
