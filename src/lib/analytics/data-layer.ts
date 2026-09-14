type PurchaseDataLayerInput = {
  transactionId: string
  value: number
  itemId?: string | null
  itemName: string
  paymentMethod?: string | null
  installments?: number | null
}

type DataLayerEntry = {
  event?: string
  ecommerce?: {
    transaction_id?: string
  }
}

declare global {
  interface Window {
    dataLayer?: DataLayerEntry[]
  }
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
