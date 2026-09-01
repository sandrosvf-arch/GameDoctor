import { createHmac, timingSafeEqual } from "crypto"
import type {
  CardPaymentResult,
  CreateCardPaymentInput,
  CreatePixPaymentInput,
  ParseWebhookInput,
  PaymentGatewayAdapter,
  PixPaymentResult,
  WebhookEvent,
} from "@/lib/payment"

type MercadoPagoPreferenceResponse = {
  id: string
  init_point: string
  sandbox_init_point?: string
}

export type MercadoPagoPaymentDetails = {
  id: number | string
  status: string | null
  status_detail?: string | null
  external_reference?: string | null
  transaction_amount?: number | null
  installments?: number | null
  date_approved?: string | null
  date_created?: string | null
  date_of_expiration?: string | null
  payment_type_id?: string | null
  payment_method_id?: string | null
  metadata?: Record<string, unknown> | null
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string | null
      qr_code_base64?: string | null
      ticket_url?: string | null
    } | null
  } | null
}

export type MercadoPagoOrderDetails = {
  id: string
  status?: string | null
  external_reference?: string | null
  total_amount?: number | string | null
  total_paid_amount?: number | string | null
  transactions?: {
    payments?: Array<{
      id?: string | number
      status?: string | null
      status_detail?: string | null
      amount?: number | string | null
      payment_method?: {
        id?: string | null
        type?: string | null
        installments?: number | null
      } | null
    }>
  } | null
}

export type MercadoPagoSubscriptionDetails = {
  id: string
  status?: string | null
  external_reference?: string | null
  payer_email?: string | null
  date_created?: string | null
  next_payment_date?: string | null
  auto_recurring?: {
    transaction_amount?: number | null
    currency_id?: string | null
    start_date?: string | null
  } | null
}

export type MercadoPagoAuthorizedPaymentDetails = {
  id: string | number
  status?: string | null
  external_reference?: string | null
  preapproval_id?: string | null
  transaction_amount?: number | null
  date_created?: string | null
  date_approved?: string | null
  payment?: {
    id?: string | number
  } | null
}

function getMercadoPagoAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.")
  }
  return token
}

export function getMercadoPagoPayerEmail(accountEmail: string) {
  const environment = process.env.MERCADOPAGO_ENVIRONMENT?.trim().toLowerCase()
  const isSandbox = environment === "sandbox" || environment === "test" || environment === "testing"

  if (!isSandbox) {
    return accountEmail
  }

  const sandboxEmail = process.env.MERCADOPAGO_SANDBOX_PAYER_EMAIL?.trim()
  if (!sandboxEmail) {
    throw new Error("MERCADOPAGO_SANDBOX_PAYER_EMAIL não configurado.")
  }

  if (!sandboxEmail.toLowerCase().endsWith("@testuser.com")) {
    throw new Error("MERCADOPAGO_SANDBOX_PAYER_EMAIL deve terminar com @testuser.com.")
  }

  return sandboxEmail
}
function getMercadoPagoWebhookSecret() {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()
  if (!secret) {
    throw new Error("MERCADOPAGO_WEBHOOK_SECRET não configurado.")
  }
  return secret
}

async function mercadoPagoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  const rawBody = await response.text()
  let data: {
    message?: unknown
    error?: unknown
    cause?: unknown
    details?: unknown
  } | null = null

  try {
    data = rawBody ? JSON.parse(rawBody) as { message?: unknown; error?: unknown; cause?: unknown; details?: unknown } : null
  } catch {
    data = null
  }

  if (!response.ok) {
    const rawCauses = Array.isArray(data?.cause) ? data.cause : data?.cause ? [data.cause] : []
    const causes = rawCauses
      .map((cause: unknown) => {
        if (!cause || typeof cause !== "object") return null
        const value = cause as { description?: unknown; code?: unknown }
        if (typeof value.description !== "string") return null
        return typeof value.code === "string"
          ? value.code + ": " + value.description
          : value.description
      })
      .filter((cause: string | null): cause is string => Boolean(cause))

    const message =
      (typeof data?.message === "string" && data.message)
      || (typeof data?.error === "string" && data.error)
      || (causes.length > 0 && causes.join(" | "))
      || (typeof data?.details === "string" && data.details)
      || (rawBody.trim() && rawBody.trim().slice(0, 500))
      || "Falha na comunicação com o Mercado Pago."

    throw new Error("Mercado Pago (" + response.status + "): " + message)
  }

  return (data ?? {}) as T
}

function parseSignatureHeader(signature: string | undefined) {
  if (!signature) {
    throw new Error("Assinatura do webhook ausente.")
  }

  const parts = signature.split(",").map((part) => part.trim())
  const values = new Map<string, string>()

  for (const part of parts) {
    const [key, ...rest] = part.split("=")
    if (!key || rest.length === 0) continue
    values.set(key.trim(), rest.join("=").trim())
  }

  const ts = values.get("ts")
  const v1 = values.get("v1")

  if (!ts || !v1) {
    throw new Error("Assinatura do webhook inválida.")
  }

  return { ts, v1 }
}

export function validateMercadoPagoWebhookSignature(input: {
  signature?: string
  requestId?: string
  dataId?: string
}) {
  const { ts, v1 } = parseSignatureHeader(input.signature)
  const requestId = input.requestId?.trim()
  const dataId = input.dataId?.trim()

  if (!requestId || !dataId) {
    throw new Error("Headers do webhook incompletos.")
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const expected = createHmac("sha256", getMercadoPagoWebhookSecret()).update(manifest).digest("hex")
  const receivedBuffer = Buffer.from(v1, "hex")
  const expectedBuffer = Buffer.from(expected, "hex")

  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) {
    throw new Error("Assinatura do webhook inválida.")
  }
}

export function normalizeMercadoPagoEventType(status: string | null | undefined) {
  if (status === "approved") return "payment_approved"
  if (status === "refunded" || status === "charged_back") {
    return status === "charged_back" ? "payment_chargeback" : "payment_refunded"
  }
  if (status === "rejected") return "payment_refused"
  if (status === "cancelled") return "payment_cancelled"
  return "payment_pending"
}

export function mapMercadoPagoStatusToInternal(status: string | null | undefined) {
  if (status === "approved" || status === "processed" || status === "completed") return "APPROVED" as const
  if (status === "pending" || status === "in_process" || status === "authorized") return "PENDING" as const
  if (status === "rejected") return "REFUSED" as const
  if (status === "cancelled") return "CANCELLED" as const
  if (status === "refunded") return "REFUNDED" as const
  if (status === "charged_back") return "CHARGEBACK" as const
  return "PENDING" as const
}

export function mapMercadoPagoMethodToInternal(input: {
  paymentTypeId?: string | null
  paymentMethodId?: string | null
}) {
  const paymentTypeId = input.paymentTypeId?.toLowerCase()
  const paymentMethodId = input.paymentMethodId?.toLowerCase()

  if (paymentTypeId === "bank_transfer" || paymentMethodId === "pix") return "PIX" as const
  if (paymentTypeId === "ticket" || paymentMethodId === "bolbradesco") return "BOLETO" as const
  if (paymentTypeId === "credit_card" || paymentMethodId === "debit_card") return "CREDIT_CARD" as const

  return null
}

export async function createMercadoPagoPreference(input: {
  title: string
  quantity?: number
  unitPrice: number
  payer: {
    name: string
    surname?: string | null
    email: string
  }
  externalReference: string
  notificationUrl: string
  successUrl: string
  pendingUrl: string
  failureUrl: string
  metadata?: Record<string, unknown>
}) {
  return mercadoPagoRequest<MercadoPagoPreferenceResponse>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          title: input.title,
          quantity: input.quantity ?? 1,
          currency_id: "BRL",
          unit_price: Number(input.unitPrice.toFixed(2)),
        },
      ],
      payer: {
        name: input.payer.name,
        surname: input.payer.surname || undefined,
        email: input.payer.email,
      },
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
      back_urls: {
        success: input.successUrl,
        pending: input.pendingUrl,
        failure: input.failureUrl,
      },
      auto_return: "approved",
      metadata: input.metadata ?? undefined,
    }),
  })
}

export async function createMercadoPagoPixPayment(input: {
  externalReference: string
  amount: number
  description: string
  payer: {
    email: string
    identification: { type: string; number: string }
  }
  idempotencyKey: string
}) {
  return mercadoPagoRequest<MercadoPagoPaymentDetails>("/v1/payments", {
    method: "POST",
    headers: {
      "X-Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: Number(input.amount.toFixed(2)),
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.externalReference,
      payer: {
        email: input.payer.email,
        identification: input.payer.identification,
      },
    }),
  })
}
export async function createMercadoPagoOrder(input: {
  externalReference: string
  amount: number
  description: string
  cardToken: string
  paymentMethodId: string

  installments: number
  payer: {
    email: string
    identification?: { type: string; number: string } | null
  }
  idempotencyKey: string
}) {
  return mercadoPagoRequest<MercadoPagoOrderDetails>("/v1/orders", {
    method: "POST",
    headers: {
      "X-Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      type: "online",
      processing_mode: "automatic",
      capture_mode: "automatic",
      total_amount: input.amount.toFixed(2),
      external_reference: input.externalReference,
      description: input.description,
      payer: {
        email: input.payer.email,
        identification: input.payer.identification || undefined,
      },
      transactions: {
        payments: [
          {
            amount: input.amount.toFixed(2),
            payment_method: {
              id: input.paymentMethodId,
              type: "credit_card",
              token: input.cardToken,

              installments: input.installments,
            },
          },
        ],
      },
    }),
  })
}

export async function getMercadoPagoOrder(orderId: string) {
  return mercadoPagoRequest<MercadoPagoOrderDetails>(`/v1/orders/${encodeURIComponent(orderId)}`)
}

export async function createMercadoPagoSubscription(input: {
  externalReference: string
  payerEmail: string
  reason: string
  annualAmount: number
  cardToken: string
  startDate: Date
  backUrl: string
}) {
  return mercadoPagoRequest<MercadoPagoSubscriptionDetails>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      card_token_id: input.cardToken,
      auto_recurring: {
        frequency: 12,
        frequency_type: "months",
        transaction_amount: Number(input.annualAmount.toFixed(2)),
        currency_id: "BRL",
        start_date: input.startDate.toISOString(),
      },
      back_url: input.backUrl,
    }),
  })
}

export async function getMercadoPagoSubscription(subscriptionId: string) {
  return mercadoPagoRequest<MercadoPagoSubscriptionDetails>(
    `/preapproval/${encodeURIComponent(subscriptionId)}`
  )
}

export async function cancelMercadoPagoSubscription(subscriptionId: string) {
  return mercadoPagoRequest<MercadoPagoSubscriptionDetails>(
    `/preapproval/${encodeURIComponent(subscriptionId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ status: "cancelled" }),
    }
  )
}

export async function getMercadoPagoAuthorizedPayment(paymentId: string) {
  return mercadoPagoRequest<MercadoPagoAuthorizedPaymentDetails>(
    `/v1/authorized_payments/${encodeURIComponent(paymentId)}`
  )
}

export async function getMercadoPagoPayment(gatewayPaymentId: string) {
  return mercadoPagoRequest<MercadoPagoPaymentDetails>(`/v1/payments/${gatewayPaymentId}`)
}

export const mercadoPagoGateway: PaymentGatewayAdapter = {
  async createPixPayment(_input: CreatePixPaymentInput): Promise<PixPaymentResult> {
    throw new Error("Mercado Pago Pix direto não é usado neste checkout.")
  },

  async createCardPayment(_input: CreateCardPaymentInput): Promise<CardPaymentResult> {
    throw new Error("Use o pedido transparente do Mercado Pago para pagamentos com cartão.")
  },

  async parseWebhook(input: ParseWebhookInput): Promise<WebhookEvent> {
    validateMercadoPagoWebhookSignature({
      signature: input.signature,
      requestId: input.requestId,
      dataId: input.dataId,
    })

    const payload = (input.payload ?? {}) as Record<string, unknown>
    const data = payload.data as { id?: string | number } | undefined
    const gatewayPaymentId = String(data?.id ?? input.dataId ?? "").trim()

    if (!gatewayPaymentId) {
      throw new Error("Webhook do Mercado Pago sem identificador do pagamento.")
    }

    const payment = await getMercadoPagoPayment(gatewayPaymentId)
    const status = payment.status ?? "pending"

    return {
      gatewayPaymentId,
      eventType: normalizeMercadoPagoEventType(status),
      status,
      rawPayload: payload,
    }
  },

  async getPaymentStatus(gatewayPaymentId: string): Promise<string> {
    const payment = await getMercadoPagoPayment(gatewayPaymentId)
    return payment.status ?? "pending"
  },
}
