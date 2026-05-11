// TODO: Admin — Gestão de Acessos
// Liberar/remover/suspender acesso por aluno × curso/plano
// Definir tipo (vitalício, prazo, cortesia, teste) e data de expiração

export default function AdminAcessosPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground">Acessos</h1>
        {/* TODO: Botão "Liberar Acesso Manual" */}
      </div>
      {/* TODO: DataTable de access_permissions com filtros */}
    </div>
  )
}
