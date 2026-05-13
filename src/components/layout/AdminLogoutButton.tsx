"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export function AdminLogoutButton({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        title="Sair"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sair
      </button>
    </div>
  )
}
