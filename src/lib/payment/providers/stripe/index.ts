/**
 * Stripe Gateway
 *
 * Docs: https://stripe.com/docs/api
 *
 * Setup:
 *   STRIPE_SECRET_KEY=sk_...
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
 *   STRIPE_WEBHOOK_SECRET=whsec_...
 *
 * TODO: implement Stripe API calls
 * SDK: npm install stripe
 */
import type {
  PaymentGatewayAdapter,
  CreatePixPaymentInput,
  CreateCardPaymentInput,
  PixPaymentResult,
  CardPaymentResult,
  WebhookEvent,
} from "@/lib/payment"

export const stripeGateway: PaymentGatewayAdapter = {
  async createPixPayment(_input: CreatePixPaymentInput): Promise<PixPaymentResult> {
    // Note: Stripe does not support Pix natively in Brazil. 
    // For Pix, use Mercado Pago, Asaas, or Pagar.me instead.
    throw new Error("Stripe does not support Pix. Use a Brazilian gateway for Pix payments.")
  },

  async createCardPayment(input: CreateCardPaymentInput): Promise<CardPaymentResult> {
    // TODO: implement using Stripe PaymentIntents API
    // Use input.cardToken (Stripe PaymentMethod ID from frontend)
    throw new Error("Stripe Card not implemented")
  },

  async parseWebhook(payload: unknown, signature?: string): Promise<WebhookEvent> {
    // TODO: validate using stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
    throw new Error("Stripe webhook not implemented")
  },

  async getPaymentStatus(gatewayPaymentId: string): Promise<string> {
    // TODO: retrieve PaymentIntent from Stripe
    throw new Error("Stripe status not implemented")
  },
}
