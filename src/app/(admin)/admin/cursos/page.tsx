// TODO: Admin — Gestão de Cursos
// CRUD: criar, editar, publicar/despublicar, arquivar, excluir
// Campos: título, slug, descrição, capa, banner, preço, status, categoria, plataforma

export default function AdminCursosPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground">Cursos</h1>
        {/* TODO: Botão "Novo Curso" → modal ou página /admin/cursos/novo */}
      </div>
      {/* TODO: DataTable de cursos com filtros por status */}
    </div>
  )
}
