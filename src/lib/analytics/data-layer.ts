type PurchaseDataLayerInput = {
  transactionId: string
  value: number
  itemId?: string | null
  itemName: string
  period?: string | null
  paymentMethod?: string | null
  installments?: number | null
}

type CheckoutDataLayerInput = {
  value: number
  itemId?: string | null
  itemName: string
  period?: string | null
}

type DataLayerItem = {
  item_id?: string
  item_name: string
  item_variant?: string
  price: number
  quantity: number
}

type DataLayerEcommerce = {
  transaction_id?: string
  value?: number
  currency?: string
  payment_type?: string
  installments?: number
  items?: DataLayerItem[]
}

type DataLayerEntry = {
  event?: string
  ecommerce?: DataLayerEcommerce
  [key: string]: unknown
}

declare global {
  interface Window {
    dataLayer?: DataLayerEntry[]
  }
}

export function trackEvent(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return

  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({ event, ...data } as DataLayerEntry)
}

export function trackBeginCheckout(input: CheckoutDataLayerInput) {
  if (typeof window === "undefined") return

  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({
    event: "begin_checkout",
    ecommerce: {
      value: input.value,
      currency: "BRL",
      items: [
        {
          item_id: input.itemId ?? undefined,
          item_name: input.itemName,
          item_variant: input.period ?? undefined,
          price: input.value,
          quantity: 1,
        },
      ],
    },
  })
}

export function trackPurchase(input: PurchaseDataLayerInput) {
  if (typeof window === "undefined" || !input.transactionId) return

  const storageKey = `gamedoctor:purchase-tracked:${input.transactionId}`
  let alreadyTracked = false

  try {
    alreadyTracked = window.sessionStorage.getItem(storageKey) === "1"
  } catch {
    // O rastreamento continua usando a própria fila quando o storage estiver indisponível.
  }

  window.dataLayer = window.dataLayer ?? []

  if (
    alreadyTracked ||
    window.dataLayer.some(
      (entry) => entry.event === "purchase" && entry.ecommerce?.transaction_id === input.transactionId
    )
  ) {
    return
  }

  window.dataLayer.push({
    event: "purchase",
    ecommerce: {
      transaction_id: input.transactionId,
      value: input.value,
      currency: "BRL",
      payment_type: input.paymentMethod ?? undefined,
      installments: input.installments ?? undefined,
      items: [
        {
          item_id: input.itemId ?? undefined,
          item_name: input.itemName,
          item_variant: input.period ?? undefined,
          price: input.value,
          quantity: 1,
        },
      ],
    },
  } as DataLayerEntry)

  try {
    window.sessionStorage.setItem(storageKey, "1")
  } catch {
    // O evento já foi enviado ao dataLayer; não bloquear a confirmação por causa do storage.
  }
}
