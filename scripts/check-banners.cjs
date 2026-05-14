const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
db.heroBanner.findMany().then(r => {
  console.log(JSON.stringify(r, null, 2))
  db.$disconnect()
})
