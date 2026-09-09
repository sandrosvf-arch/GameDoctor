import { db } from "@/lib/db"
import { sendLiveCheckoutAccessIfNeeded } from "@/lib/payment/live-checkout-approval"

const shouldSend = process.argv.includes("--send")
const timeZone = "America/Sao_Paulo"

function getTodayBounds() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const start = new Date(`${values.year}-${values.month}-${values.day}T00:00:00-03:00`)
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) }
}

async function main() {
  const { start, end } = getTodayBounds()
  const orders = await db.order.findMany({
    where: {
      checkoutChannel: "LIVE",
      paymentStatus: "APPROVED",
      accessGrantedAt: { not: null },
      createdAt: { gte: start, lt: end },
    },
    select: {
      id: true,
      createdAt: true,
      accessEmailSentAt: true,
      user: { select: { email: true, lastLoginAt: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const pending = orders.filter((order) => !order.user.lastLoginAt || order.user.lastLoginAt < order.createdAt)
  console.log(`Pedidos aprovados de hoje: ${orders.length}`)
  console.log(`Sem acesso após a compra: ${pending.length}`)

  if (!shouldSend) {
    for (const order of pending) console.log(`DRY-RUN ${order.id} ${order.user.email} enviado=${Boolean(order.accessEmailSentAt)}`)
    console.log("Nada foi enviado. Use --send para disparar os e-mails.")
    return
  }

  let sent = 0
  let skipped = 0
  for (const order of pending) {
    try {
      const result = await sendLiveCheckoutAccessIfNeeded(order.id, true)
      if (result.sent) {
        sent += 1
        console.log(`ENVIADO ${order.id} ${order.user.email}`)
      } else {
        skipped += 1
        console.log(`IGNORADO ${order.id} ${result.reason}`)
      }
    } catch (error) {
      skipped += 1
      console.error(`FALHOU ${order.id}`, error instanceof Error ? error.message : error)
    }
  }

  console.log(`Resultado: ${sent} enviados, ${skipped} ignorados/falhos.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
