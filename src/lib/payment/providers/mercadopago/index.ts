/**
 * Mercado Pago Gateway
 *
 * Docs: https://www.mercadopago.com.br/developers/pt/docs
 *
 * Setup:
 *   MERCADOPAGO_ACCESS_TOKEN=...
 *   MERCADOPAGO_WEBHOOK_SECRET=...
 *   NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=...
 *
 * TODO: implement Mercado Pago API calls
 * SDK: npm install mercadopago
 */
import type {
  PaymentGatewayAdapter,
  CreatePixPaymentInput,
  CreateCardPaymentInput,
  PixPaymentResult,
  CardPaymentResult,
  WebhookEvent,
} from "@/lib/payment"

export const mercadoPagoGateway: PaymentGatewayAdapter = {
  async createPixPayment(input: CreatePixPaymentInput): Promise<PixPaymentResult> {
    // TODO: implement using Mercado Pago Payments API
    // POST https://api.mercadopago.com/v1/payments
    // payment_method_id: "pix"
    throw new Error("Mercado Pago Pix not implemented")
  },

  async createCardPayment(input: CreateCardPaymentInput): Promise<CardPaymentResult> {
    // TODO: implement using Mercado Pago Payments API
    // payment_method_id: "credit_card", token: input.cardToken
    throw new Error("Mercado Pago Card not implemented")
  },

  async parseWebhook(payload: unknown, signature?: string): Promise<WebhookEvent> {
    // TODO: validate x-signature header from Mercado Pago
    // https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
    throw new Error("Mercado Pago webhook not implemented")
  },

  async getPaymentStatus(gatewayPaymentId: string): Promise<string> {
    // TODO: GET https://api.mercadopago.com/v1/payments/{id}
    throw new Error("Mercado Pago status not implemented")
  },
}
