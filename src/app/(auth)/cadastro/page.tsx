"use client"

import { Suspense, useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Chrome } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function CadastroContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invitedEmail = searchParams.get("email") ?? ""
  const isAdminInvite = searchParams.get("invite") === "admin"

  useEffect(() => {
    if (invitedEmail) {
      setEmail(invitedEmail)
    }
  }, [invitedEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("As senhas não coincidem.")
      return
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.")
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "Erro ao criar conta. Tente novamente.")
      return
    }

    // Auto-login após cadastro
    await signIn("credentials", { email, password, redirect: false })
    router.push("/dashboard")
    router.refresh()
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await signIn("google", { callbackUrl: "/dashboard" })
  }

  return (
    <Card className="w-full max-w-md border-border/50 shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Criar conta</CardTitle>
        <CardDescription>
          {isAdminInvite
            ? "Você foi convidado para a equipe administrativa."
            : "Comece sua jornada com o GameDoctor"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isAdminInvite && (
          <>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Chrome className="h-4 w-4 mr-2" />
              )}
              Cadastrar com Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>
          </>
        )}

        {isAdminInvite && (
          <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-300">
            Convite administrativo detectado. Finalize seu cadastro com nome e senha para ativar o acesso.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading || googleLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || googleLoading || Boolean(invitedEmail)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || googleLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="Repita a senha"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={loading || googleLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading || googleLoading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar conta
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default function CadastroPage() {
  return (
    <Suspense>
      <CadastroContent />
    </Suspense>
  )
}
