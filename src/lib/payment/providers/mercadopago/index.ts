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
}

function getMercadoPagoAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.")
  }
  return token
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

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      (typeof data?.message === "string" && data.message)
      || (Array.isArray(data?.cause) && typeof data.cause[0]?.description === "string" && data.cause[0].description)
      || "Falha na comunicação com o Mercado Pago."

    throw new Error(message)
  }

  return data as T
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
  if (status === "refunded" || status === "charged_back") return status === "charged_back" ? "payment_chargeback" : "payment_refunded"
  if (status === "rejected") return "payment_refused"
  if (status === "cancelled") return "payment_cancelled"
  return "payment_pending"
}

export function mapMercadoPagoStatusToInternal(status: string | null | undefined) {
  if (status === "approved") return "APPROVED" as const
  if (status === "pending" || status === "in_process") return "PENDING" as const
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
  if (paymentTypeId === "credit_card" || paymentTypeId === "debit_card") return "CREDIT_CARD" as const

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

export async function getMercadoPagoPayment(gatewayPaymentId: string) {
  return mercadoPagoRequest<MercadoPagoPaymentDetails>(`/v1/payments/${gatewayPaymentId}`)
}

export const mercadoPagoGateway: PaymentGatewayAdapter = {
  async createPixPayment(_input: CreatePixPaymentInput): Promise<PixPaymentResult> {
    throw new Error("Mercado Pago Pix direto não é usado neste checkout.")
  },

  async createCardPayment(_input: CreateCardPaymentInput): Promise<CardPaymentResult> {
    throw new Error("Mercado Pago cartão direto não é usado neste checkout.")
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
