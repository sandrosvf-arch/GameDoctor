const { PrismaClient } = require("@prisma/client")
const db = new PrismaClient()

async function main() {
  // 1. Deletar "Diagnóstico Completo PS5"
  const diagnostico = await db.course.findFirst({ where: { slug: "diagnostico-ps5" } })
  if (diagnostico) {
    // Apagar lessons vinculadas via modules
    const modules = await db.module.findMany({ where: { courseId: diagnostico.id } })
    for (const mod of modules) {
      await db.lesson.deleteMany({ where: { moduleId: mod.id } })
    }
    await db.module.deleteMany({ where: { courseId: diagnostico.id } })
    await db.course.delete({ where: { id: diagnostico.id } })
    console.log("✅ Deletado: Diagnóstico Completo PS5")
  } else {
    console.log("ℹ️  Curso 'diagnostico-ps5' não encontrado (já removido?)")
  }

  // 2. Listar aulas de "Início da Jornada" para ver estado atual
  const inicio = await db.course.findFirst({
    where: { slug: "inicio-da-jornada" },
    include: {
      modules: {
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, description: true, videoProviderId: true, videoEmbedUrl: true, isFree: true, order: true }
          }
        }
      }
    }
  })

  if (inicio) {
    const lessons = inicio.modules.flatMap(m => m.lessons)
    console.log(`\n📚 Trilha: ${inicio.title} (${lessons.length} aulas)`)
    lessons.forEach(l => {
      console.log(`  [${l.order}] ${l.title}`)
      console.log(`       ID Bunny : ${l.videoProviderId ?? "(vazio)"}`)
      console.log(`       Legenda  : ${l.description ?? "(vazio)"}`)
      console.log(`       Grátis   : ${l.isFree}`)
    })
  }

  // 3. Mostrar estado final de todos os cursos
  const all = await db.course.findMany({
    select: { title: true, slug: true, displayOrder: true, _count: { select: { lessons: true } } },
    orderBy: { displayOrder: "asc" }
  })
  console.log("\n📋 Cursos restantes:")
  all.forEach(c => console.log(`  [${c.displayOrder}] ${c.title} (${c._count.lessons} aulas) — ${c.slug}`))
}

main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect() })
