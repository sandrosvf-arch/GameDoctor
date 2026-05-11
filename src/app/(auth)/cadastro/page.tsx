// TODO: Fase 1 — Cadastro
// Campos: nome, e-mail, telefone, senha, confirmar senha
// Aceite de termos de uso e política de privacidade
// Botão Google OAuth
export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Criar conta</h1>
          <p className="text-muted-foreground mt-2">Comece sua jornada com o GameDoctor</p>
        </div>
        {/* TODO: RegisterForm component (credentials + Google) */}
        {/* TODO: Link para /login */}
      </div>
    </div>
  )
}
