/**
 * Pagar.me Gateway
 *
 * Docs: https://docs.pagar.me/
 *
 * Setup:
 *   PAGARME_API_KEY=ak_...
 *   PAGARME_WEBHOOK_SECRET=...
 *
 * TODO: implement Pagar.me API calls
 */
import type {
  ParseWebhookInput,
  PaymentGatewayAdapter,
  CreatePixPaymentInput,
  CreateCardPaymentInput,
  PixPaymentResult,
  CardPaymentResult,
  WebhookEvent,
} from "@/lib/payment"

export const pagarmeGateway: PaymentGatewayAdapter = {
  async createPixPayment(input: CreatePixPaymentInput): Promise<PixPaymentResult> {
    // TODO: POST https://api.pagar.me/core/v5/orders
    // payment_method: "pix"
    throw new Error("Pagar.me Pix not implemented")
  },

  async createCardPayment(input: CreateCardPaymentInput): Promise<CardPaymentResult> {
    // TODO: POST https://api.pagar.me/core/v5/orders
    // payment_method: "credit_card", card_token: input.cardToken
    throw new Error("Pagar.me Card not implemented")
  },

  async parseWebhook(_input: ParseWebhookInput): Promise<WebhookEvent> {
    // TODO: validate Pagar.me webhook signature
    throw new Error("Pagar.me webhook not implemented")
  },

  async getPaymentStatus(gatewayPaymentId: string): Promise<string> {
    // TODO: GET https://api.pagar.me/core/v5/orders/{id}
    throw new Error("Pagar.me status not implemented")
  },
}
