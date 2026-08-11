// One-off backfill: turn on the 7s teaser preview for existing paid lessons
// that were created before previewEnabled/previewDurationSeconds were wired up.
// Safe to re-run — only touches rows still at their default (false / null).
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function main() {
  const enabled = await db.lesson.updateMany({
    where: { isFree: false, status: 'PUBLISHED', previewEnabled: false },
    data: { previewEnabled: true },
  })
  const timed = await db.lesson.updateMany({
    where: { isFree: false, status: 'PUBLISHED', previewDurationSeconds: null },
    data: { previewDurationSeconds: 7 },
  })
  console.log(`previewEnabled turned on for ${enabled.count} lessons`)
  console.log(`previewDurationSeconds set to 7s for ${timed.count} lessons`)
}

main().finally(() => db.$disconnect())
