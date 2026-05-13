const { PrismaClient } = require("@prisma/client")
const db = new PrismaClient()

async function main() {
  // Buscar aulas diretamente pelo courseId (sem módulo)
  const inicio = await db.course.findFirst({ where: { slug: "inicio-da-jornada" } })
  if (!inicio) { console.log("Trilha não encontrada"); return }

  const lessons = await db.lesson.findMany({
    where: { courseId: inicio.id },
    orderBy: { order: "asc" }
  })
  console.log(`Trilha: ${inicio.title} — ${lessons.length} aula(s) diretas`)
  lessons.forEach(l => {
    console.log(`  id         : ${l.id}`)
    console.log(`  title      : ${l.title}`)
    console.log(`  description: ${l.description ?? "(vazio)"}`)
    console.log(`  bunny id   : ${l.videoProviderId ?? "(vazio)"}`)
    console.log(`  embedUrl   : ${l.videoEmbedUrl ?? "(vazio)"}`)
    console.log(`  isFree     : ${l.isFree}`)
    console.log(`  moduleId   : ${l.moduleId ?? "(nenhum)"}`)
    console.log()
  })
}

main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect() })
