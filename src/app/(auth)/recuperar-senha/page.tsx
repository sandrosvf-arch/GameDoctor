// TODO: Fase 1 — Recuperação de senha
// Fluxo: informar e-mail → receber link → criar nova senha → confirmação
export default function RecuperarSenhaPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Recuperar senha</h1>
          <p className="text-muted-foreground mt-2">
            Informe seu e-mail para receber o link de recuperação
          </p>
        </div>
        {/* TODO: ForgotPasswordForm component */}
      </div>
    </div>
  )
}
