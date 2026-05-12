import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  console.log("🌱 Seeding demo data...")

  // Platform
  const platform = await db.platform.upsert({
    where: { slug: "playstation-5" },
    update: {},
    create: {
      name: "PlayStation 5",
      slug: "playstation-5",
      order: 1,
      status: "ACTIVE",
    },
  })
  console.log("✅ Platform:", platform.name)

  // Course
  const course = await db.course.upsert({
    where: { slug: "diagnostico-ps5" },
    update: {},
    create: {
      title: "Diagnóstico Completo PS5",
      slug: "diagnostico-ps5",
      shortDescription: "Aprenda a identificar e resolver os problemas mais comuns do PlayStation 5.",
      description:
        "Neste curso você vai aprender do zero a fazer diagnóstico completo no PS5: erros de sistema, superaquecimento, falhas de leitura de disco e muito mais.",
      status: "PUBLISHED",
      platformId: platform.id,
    },
  })
  console.log("✅ Course:", course.title)

  // Module
  const mod = await db.module.upsert({
    where: { id: "demo-module-ps5-01" },
    update: {},
    create: {
      id: "demo-module-ps5-01",
      title: "Módulo 1 — Introdução e Diagnóstico",
      order: 1,
      status: "ACTIVE",
      courseId: course.id,
    },
  })
  console.log("✅ Module:", mod.title)

  // Lesson 1 — Free demo with local video
  const lesson1 = await db.lesson.upsert({
    where: { id: "demo-lesson-ps5-01" },
    update: {},
    create: {
      id: "demo-lesson-ps5-01",
      title: "Boas-vindas e visão geral do curso",
      description:
        "Nesta aula de introdução você vai conhecer o conteúdo do curso, as ferramentas necessárias e o método de trabalho que vamos usar ao longo de todas as aulas.\n\nAbaixo você encontra o PDF de ferramentas recomendadas e o link para o grupo de suporte.",
      order: 1,
      isFree: true,
      previewEnabled: false,
      status: "PUBLISHED",
      courseId: course.id,
      moduleId: mod.id,
      // Using the hero video as demo playback
      videoPlaybackUrl: "/hero-bg.mp4",
      videoDurationSeconds: 90,
    },
  })
  console.log("✅ Lesson 1:", lesson1.title)

  // Lesson 2 — Paid with preview
  const lesson2 = await db.lesson.upsert({
    where: { id: "demo-lesson-ps5-02" },
    update: {},
    create: {
      id: "demo-lesson-ps5-02",
      title: "Ferramentas essenciais para diagnóstico PS5",
      description:
        "Conheça as ferramentas que todo técnico precisa ter: multímetro, estação de ar quente, microscópio USB e muito mais.",
      order: 2,
      isFree: false,
      previewEnabled: true,
      previewDurationSeconds: 30,
      status: "PUBLISHED",
      courseId: course.id,
      moduleId: mod.id,
      videoPlaybackUrl: "/hero-bg.mp4",
      videoDurationSeconds: 180,
    },
  })
  console.log("✅ Lesson 2:", lesson2.title)

  // Lesson 3 — Paid
  const lesson3 = await db.lesson.upsert({
    where: { id: "demo-lesson-ps5-03" },
    update: {},
    create: {
      id: "demo-lesson-ps5-03",
      title: "Erro CE-108255-1: causa e solução definitiva",
      description: "Análise completa do erro mais comum no PS5 e como resolver sem precisar enviar para a assistência.",
      order: 3,
      isFree: false,
      previewEnabled: true,
      previewDurationSeconds: 20,
      status: "PUBLISHED",
      courseId: course.id,
      moduleId: mod.id,
      videoPlaybackUrl: "/hero-bg.mp4",
      videoDurationSeconds: 240,
    },
  })
  console.log("✅ Lesson 3:", lesson3.title)

  // Materials for lesson 1
  await db.material.upsert({
    where: { id: "demo-mat-01" },
    update: {},
    create: {
      id: "demo-mat-01",
      title: "Lista de Ferramentas Recomendadas",
      description: "PDF com links e preços atualizados",
      externalUrl: "https://exemplo.com/ferramentas.pdf",
      type: "PDF",
      isFree: true,
      status: "ACTIVE",
      courseId: course.id,
      lessonId: lesson1.id,
    },
  })

  await db.material.upsert({
    where: { id: "demo-mat-02" },
    update: {},
    create: {
      id: "demo-mat-02",
      title: "Grupo de Suporte no WhatsApp",
      description: "Tire dúvidas com outros alunos",
      externalUrl: "https://chat.whatsapp.com/example",
      type: "LINK",
      isFree: true,
      status: "ACTIVE",
      courseId: course.id,
      lessonId: lesson1.id,
    },
  })

  await db.material.upsert({
    where: { id: "demo-mat-03" },
    update: {},
    create: {
      id: "demo-mat-03",
      title: "Checklist de Diagnóstico PS5",
      description: "Passo a passo para não esquecer nenhuma etapa",
      externalUrl: "https://exemplo.com/checklist.pdf",
      type: "CHECKLIST",
      isFree: true,
      status: "ACTIVE",
      courseId: course.id,
      lessonId: lesson1.id,
    },
  })
  console.log("✅ Materials seeded")

  console.log("")
  console.log("🎉 Done! Demo lesson URLs:")
  console.log("   Free:  http://localhost:3000/aula/demo-lesson-ps5-01")
  console.log("   Paid:  http://localhost:3000/aula/demo-lesson-ps5-02  (preview 30s)")
  console.log("   Paid:  http://localhost:3000/aula/demo-lesson-ps5-03  (preview 20s)")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
