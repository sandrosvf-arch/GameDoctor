const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
db.user.update({
  where: { email: 'sandrosvf@gmail.com' },
  data: { role: 'ADMIN' },
  select: { id: true, email: true, role: true }
})
  .then(u => console.log('Updated:', JSON.stringify(u, null, 2)))
  .finally(() => db.$disconnect())
