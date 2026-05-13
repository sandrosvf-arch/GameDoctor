const { PrismaClient } = require("@prisma/client")
const db = new PrismaClient()
db.course.findMany({
  select: { slug: true, displayOrder: true, title: true },
  orderBy: { displayOrder: "asc" }
}).then(r => {
  console.log(JSON.stringify(r, null, 2))
  db.$disconnect()
})
