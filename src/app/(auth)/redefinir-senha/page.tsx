"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (password !== confirmation) {
      setError("As senhas não coincidem.")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? "Não foi possível redefinir a senha.")
      setSuccess(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível redefinir a senha.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-border/50 shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Criar nova senha</CardTitle>
        <CardDescription>Defina uma nova senha para acessar sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="font-medium">Senha atualizada!</p>
            <p className="text-sm text-muted-foreground">Você já pode entrar usando sua nova senha.</p>
            <Button asChild className="mt-2 w-full"><Link href="/login">Entrar</Link></Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading || !token} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirmar nova senha</Label>
              <Input id="confirmation" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={loading || !token} />
            </div>
            {!token && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">Link de recuperação inválido.</p>}
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Redefinir senha
            </Button>
          </form>
        )}
      </CardContent>
      {!success && <CardFooter className="justify-center"><Link href="/recuperar-senha" className="text-sm text-muted-foreground transition-colors hover:text-primary">Solicitar outro link</Link></CardFooter>}
    </Card>
  )
}

export default function RedefinirSenhaPage() {
  return <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-primary" />}><ResetPasswordForm /></Suspense>
}
