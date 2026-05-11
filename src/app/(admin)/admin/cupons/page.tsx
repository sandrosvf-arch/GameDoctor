// TODO: Admin — Gestão de Cupons
// CRUD: criar, editar, desativar cupons
// Campos: código, tipo desconto (% ou fixo), plano aplicável, validade, limite de uso

export default function AdminCuponsPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground">Cupons</h1>
      </div>
      {/* TODO: DataTable de cupons com código, desconto, usos, validade, status */}
    </div>
  )
}
