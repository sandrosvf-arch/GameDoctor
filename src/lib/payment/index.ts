/**
 * Payment Gateway Abstraction Layer
 *
 * Architecture: register adapters for each gateway at startup.
 * Switch gateways without changing application code.
 *
 * Supported: MERCADOPAGO | PAGARME | ASAAS | STRIPE | IUGU | PAGSEGURO
 */

export type PaymentGatewayName =
  | "MERCADOPAGO"
  | "PAGARME"
  | "ASAAS"
  | "STRIPE"
  | "IUGU"
  | "PAGSEGURO"

// ─── Input types ──────────────────────────────────────────────

export interface CreatePixPaymentInput {
  orderId: string
  amount: number
  customerName: string
  customerEmail: string
  customerCpf: string
  description: string
  expiresInMinutes?: number
}

export interface CreateCardPaymentInput {
  orderId: string
  amount: number
  installments: number
  customerName: string
  customerEmail: string
  customerCpf: string
  /** Tokenized card reference (never raw card data) */
  cardToken: string
  description: string
}

// ─── Result types ─────────────────────────────────────────────

export interface PixPaymentResult {
  gatewayPaymentId: string
  pixQrCode: string
  pixCopyPaste: string
  expiresAt: Date
  status: "PENDING"
}

export interface CardPaymentResult {
  gatewayPaymentId: string
  status: "APPROVED" | "REFUSED" | "PENDING"
  message?: string
}

// ─── Webhook ──────────────────────────────────────────────────

export interface WebhookEvent {
  gatewayPaymentId: string
  /** Normalized event type: payment_approved | payment_refused | etc. */
  eventType: string
  /** Normalized status */
  status: string
  rawPayload: Record<string, unknown>
}

// ─── Adapter interface ────────────────────────────────────────

export interface PaymentGatewayAdapter {
  createPixPayment(input: CreatePixPaymentInput): Promise<PixPaymentResult>
  createCardPayment(input: CreateCardPaymentInput): Promise<CardPaymentResult>
  /**
   * Parse and validate the incoming webhook payload.
   * Throw if signature is invalid.
   */
  parseWebhook(payload: unknown, signature?: string): Promise<WebhookEvent>
  getPaymentStatus(gatewayPaymentId: string): Promise<string>
}

// ─── Registry ─────────────────────────────────────────────────

const registry = new Map<PaymentGatewayName, PaymentGatewayAdapter>()

export function registerPaymentGateway(
  name: PaymentGatewayName,
  adapter: PaymentGatewayAdapter
): void {
  registry.set(name, adapter)
}

export function getPaymentGateway(name: PaymentGatewayName): PaymentGatewayAdapter {
  const adapter = registry.get(name)
  if (!adapter) {
    throw new Error(
      `Payment gateway "${name}" is not registered. ` +
        `Register it in src/lib/payment/providers/${name.toLowerCase()}/index.ts`
    )
  }
  return adapter
}
