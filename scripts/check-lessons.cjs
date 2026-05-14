const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
db.lesson.findMany({
  where: { course: { slug: 'inicio-da-jornada' } },
  select: { id: true, title: true, status: true, order: true, videoProviderId: true }
}).then(r => {
  console.log(JSON.stringify(r, null, 2))
  db.$disconnect()
})
