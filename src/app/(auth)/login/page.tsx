// TODO: Fase 1 — Login
// Campos: e-mail, senha | botão Google OAuth
// Links: recuperar senha, criar conta
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Entrar</h1>
          <p className="text-muted-foreground mt-2">Acesse sua conta GameDoctor</p>
        </div>
        {/* TODO: LoginForm component (credentials + Google) */}
        {/* TODO: Link para /cadastro e /recuperar-senha */}
      </div>
    </div>
  )
}
