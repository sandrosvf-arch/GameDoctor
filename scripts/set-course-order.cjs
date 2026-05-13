// Set initial displayOrder for courses to match the home page order
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

const order = [
  { slug: 'inicio-da-jornada',        displayOrder: 0 },
  { slug: 'playstation-5',            displayOrder: 1 },
  { slug: 'xbox-series-xs',           displayOrder: 2 },
  { slug: 'nintendo-switch',          displayOrder: 3 },
  { slug: 'fundamentos-de-eletronica',displayOrder: 4 },
]

async function main() {
  for (const { slug, displayOrder } of order) {
    await db.course.updateMany({ where: { slug }, data: { displayOrder } })
    console.log(`✅ ${slug} → order ${displayOrder}`)
  }
  console.log('\n✨ Ordens definidas!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
