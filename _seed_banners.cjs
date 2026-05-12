// _seed_banners.cjs — seeds 2 hero banners
const { PrismaClient } = require("@prisma/client")
const db = new PrismaClient()

async function main() {
  await db.heroBanner.deleteMany()

  await db.heroBanner.createMany({
    data: [
      {
        title: "A sua nova plataforma de manutenção de videogames",
        subtitle:
          "Assista aulas gravadas em 4K, acesse esquemas elétricos exclusivos, aprenda técnicas de solda BGA e diagnóstico avançado — do básico ao profissional.",
        badge: "Técnico de consoles profissional",
        videoUrl: "/hero-bg.mp4",
        imageUrl: null,
        ctaText: "Ver aulas grátis",
        ctaHref: "/cursos",
        secondaryCtaText: "Ver planos",
        secondaryCtaHref: "/planos",
        consoles: [
          "PlayStation 5",
          "PlayStation 4",
          "Xbox Series X|S",
          "Xbox One",
          "Nintendo Switch",
          "Switch OLED",
        ],
        order: 0,
        isActive: true,
      },
      {
        title: "Solda BGA do zero ao profissional",
        subtitle:
          "Domine reballing e solda BGA no PS5, Xbox Series X e Nintendo Switch. Técnica passo a passo com zoom no microscópio — sem mistério.",
        badge: "Curso avançado • PS5 · Xbox · Switch",
        videoUrl: "/hero-bg.mp4",
        imageUrl: null,
        ctaText: "Ver curso de BGA",
        ctaHref: "/aula/demo-lesson-ps5-01",
        secondaryCtaText: "Todos os cursos",
        secondaryCtaHref: "/cursos",
        consoles: ["PlayStation 5", "Xbox Series X", "Nintendo Switch"],
        order: 1,
        isActive: true,
      },
    ],
  })

  console.log("✓ 2 banners criados")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
