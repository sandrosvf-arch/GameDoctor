import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  console.log("Seeding demo data...")

  const adminUser = await db.user.upsert({
    where: { email: "admin.demo@gamedoctor.local" },
    update: {
      name: "Admin Demo",
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      name: "Admin Demo",
      email: "admin.demo@gamedoctor.local",
      role: "ADMIN",
      status: "ACTIVE",
    },
  })
  console.log("Admin user:", adminUser.email)

  const studentUser = await db.user.upsert({
    where: { email: "aluno.demo@gamedoctor.local" },
    update: {
      name: "Aluno Demo",
      role: "STUDENT",
      status: "ACTIVE",
    },
    create: {
      name: "Aluno Demo",
      email: "aluno.demo@gamedoctor.local",
      role: "STUDENT",
      status: "ACTIVE",
    },
  })
  console.log("Student user:", studentUser.email)

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
  console.log("Platform:", platform.name)

  const course = await db.course.upsert({
    where: { slug: "diagnostico-ps5" },
    update: {},
    create: {
      title: "Diagnostico Completo PS5",
      slug: "diagnostico-ps5",
      shortDescription:
        "Aprenda a identificar e resolver os problemas mais comuns do PlayStation 5.",
      description:
        "Neste curso voce vai aprender do zero a fazer diagnostico completo no PS5: erros de sistema, superaquecimento, falhas de leitura de disco e muito mais.",
      status: "PUBLISHED",
      platformId: platform.id,
    },
  })
  console.log("Course:", course.title)

  const mod = await db.module.upsert({
    where: { id: "demo-module-ps5-01" },
    update: {},
    create: {
      id: "demo-module-ps5-01",
      title: "Modulo 1 - Introducao e Diagnostico",
      order: 1,
      status: "ACTIVE",
      courseId: course.id,
    },
  })
  console.log("Module:", mod.title)

  const lesson1 = await db.lesson.upsert({
    where: { id: "demo-lesson-ps5-01" },
    update: {},
    create: {
      id: "demo-lesson-ps5-01",
      title: "Boas-vindas e visao geral do curso",
      description:
        "Nesta aula de introducao voce vai conhecer o conteudo do curso, as ferramentas necessarias e o metodo de trabalho que vamos usar ao longo de todas as aulas.\n\nAbaixo voce encontra o PDF de ferramentas recomendadas e o link para o grupo de suporte.",
      order: 1,
      isFree: true,
      previewEnabled: false,
      status: "PUBLISHED",
      courseId: course.id,
      moduleId: mod.id,
      videoPlaybackUrl: "/hero-bg.mp4",
      videoDurationSeconds: 90,
    },
  })
  console.log("Lesson 1:", lesson1.title)

  const lesson2 = await db.lesson.upsert({
    where: { id: "demo-lesson-ps5-02" },
    update: {},
    create: {
      id: "demo-lesson-ps5-02",
      title: "Ferramentas essenciais para diagnostico PS5",
      description:
        "Conheca as ferramentas que todo tecnico precisa ter: multimetro, estacao de ar quente, microscopio USB e muito mais.",
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
  console.log("Lesson 2:", lesson2.title)

  const lesson3 = await db.lesson.upsert({
    where: { id: "demo-lesson-ps5-03" },
    update: {},
    create: {
      id: "demo-lesson-ps5-03",
      title: "Erro CE-108255-1: causa e solucao definitiva",
      description:
        "Analise completa do erro mais comum no PS5 e como resolver sem precisar enviar para a assistencia.",
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
  console.log("Lesson 3:", lesson3.title)

  await db.material.upsert({
    where: { id: "demo-mat-01" },
    update: {},
    create: {
      id: "demo-mat-01",
      title: "Lista de Ferramentas Recomendadas",
      description: "PDF com links e precos atualizados",
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
      description: "Tire duvidas com outros alunos",
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
      title: "Checklist de Diagnostico PS5",
      description: "Passo a passo para nao esquecer nenhuma etapa",
      externalUrl: "https://exemplo.com/checklist.pdf",
      type: "CHECKLIST",
      isFree: true,
      status: "ACTIVE",
      courseId: course.id,
      lessonId: lesson1.id,
    },
  })
  console.log("Materials seeded")

  const approvedComment = await db.comment.upsert({
    where: { id: "demo-comment-approved-01" },
    update: {
      lessonId: lesson1.id,
      userId: studentUser.id,
      parentId: null,
      content:
        "Gostei bastante da introducao. Voces vao mostrar depois quais ferramentas sao obrigatorias para quem esta comecando?",
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: adminUser.id,
    },
    create: {
      id: "demo-comment-approved-01",
      lessonId: lesson1.id,
      userId: studentUser.id,
      parentId: null,
      content:
        "Gostei bastante da introducao. Voces vao mostrar depois quais ferramentas sao obrigatorias para quem esta comecando?",
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: adminUser.id,
    },
  })

  await db.comment.upsert({
    where: { id: "demo-comment-reply-01" },
    update: {
      lessonId: lesson1.id,
      userId: adminUser.id,
      parentId: approvedComment.id,
      content:
        "Sim. Nas proximas aulas mostramos a bancada minima e tambem as ferramentas recomendadas para evoluir.",
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: adminUser.id,
    },
    create: {
      id: "demo-comment-reply-01",
      lessonId: lesson1.id,
      userId: adminUser.id,
      parentId: approvedComment.id,
      content:
        "Sim. Nas proximas aulas mostramos a bancada minima e tambem as ferramentas recomendadas para evoluir.",
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: adminUser.id,
    },
  })

  await db.comment.upsert({
    where: { id: "demo-comment-pending-01" },
    update: {
      lessonId: lesson2.id,
      userId: studentUser.id,
      parentId: null,
      content:
        "No meu caso o console liga e desliga em seguida. Esse curso cobre esse tipo de diagnostico tambem?",
      status: "PENDING",
      approvedAt: null,
      approvedBy: null,
    },
    create: {
      id: "demo-comment-pending-01",
      lessonId: lesson2.id,
      userId: studentUser.id,
      parentId: null,
      content:
        "No meu caso o console liga e desliga em seguida. Esse curso cobre esse tipo de diagnostico tambem?",
      status: "PENDING",
    },
  })

  await db.comment.upsert({
    where: { id: "demo-comment-rejected-01" },
    update: {
      lessonId: lesson3.id,
      userId: studentUser.id,
      parentId: null,
      content:
        "Comentario de teste para validar o fluxo de rejeicao no painel administrativo.",
      status: "REJECTED",
      approvedAt: null,
      approvedBy: null,
    },
    create: {
      id: "demo-comment-rejected-01",
      lessonId: lesson3.id,
      userId: studentUser.id,
      parentId: null,
      content:
        "Comentario de teste para validar o fluxo de rejeicao no painel administrativo.",
      status: "REJECTED",
    },
  })
  console.log("Comments seeded")

  console.log("")
  console.log("Done! Demo lesson URLs:")
  console.log("   Free:  http://localhost:3000/aula/demo-lesson-ps5-01")
  console.log("   Paid:  http://localhost:3000/aula/demo-lesson-ps5-02  (preview 30s)")
  console.log("   Paid:  http://localhost:3000/aula/demo-lesson-ps5-03  (preview 20s)")
  console.log("   Admin comments: http://localhost:3000/admin/comentarios")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
