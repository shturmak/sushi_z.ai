// ============================================================
// Payment Provider Registry
// ============================================================
// Extensible registry pattern: add Fondy, Stripe, Portmone, etc.
// Each provider implements the PaymentProvider interface.
// ============================================================

import type { LiqPayCheckoutParams } from './liqpay';
import {
  createCheckout as liqpayCreateCheckout,
  verifyCallback as liqpayVerifyCallback,
  mapStatus as liqpayMapStatus,
  type LiqPayCallbackData,
} from './liqpay';

// ── Shared Types ───────────────────────────────────────────

export type CheckoutParams = LiqPayCheckoutParams;

export interface CheckoutResult {
  /** Base64-encoded payment data (provider-specific) */
  data: string;
  /** SHA1 signature for the data */
  signature: string;
  /** Full URL to redirect the user to */
  checkoutUrl: string;
}

export interface CallbackResult {
  /** Whether the callback signature is valid */
  valid: boolean;
  /** Mapped internal payment status */
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  /** Provider's transaction ID */
  providerTxId: string;
  /** Our internal order_id / payment ID sent in checkout */
  orderId: string;
  /** Full raw callback payload (for providerPayload storage) */
  rawPayload: unknown;
}

export interface PaymentProvider {
  name: string;
  createCheckout: (params: CheckoutParams) => Promise<CheckoutResult>;
  verifyCallback: (body: unknown) => Promise<CallbackResult>;
}

// ── LiqPay Provider ────────────────────────────────────────

const liqpayProvider: PaymentProvider = {
  name: 'liqpay',

  async createCheckout(params) {
    const result = await liqpayCreateCheckout(params);
    return {
      data: result.data,
      signature: result.signature,
      checkoutUrl: result.checkoutUrl,
    };
  },

  async verifyCallback(body: unknown) {
    // LiqPay sends form-encoded or JSON with { data, signature }
    const payload = body as Record<string, string> | null;
    if (!payload || typeof payload.data !== 'string' || typeof payload.signature !== 'string') {
      return {
        valid: false,
        status: 'pending',
        providerTxId: '',
        orderId: '',
        rawPayload: body,
      };
    }

    const decoded = await liqpayVerifyCallback(payload.data, payload.signature);
    if (!decoded) {
      return {
        valid: false,
        status: 'pending',
        providerTxId: '',
        orderId: '',
        rawPayload: body,
      };
    }

    return {
      valid: true,
      status: liqpayMapStatus(decoded.status),
      providerTxId: decoded.transaction_id || '',
      orderId: decoded.order_id,
      rawPayload: decoded,
    };
  },
};

// ── Registry ───────────────────────────────────────────────

const providers: Record<string, PaymentProvider> = {
  liqpay: liqpayProvider,
  // Future providers:
  // fondy: fondyProvider,
  // stripe: stripeProvider,
  // portmone: portmoneProvider,
};

/**
 * Get a payment provider by name.
 * Returns null for unknown providers.
 */
export function getProvider(name: string): PaymentProvider | null {
  return providers[name] ?? null;
}

/**
 * List all registered provider names.
 */
export function getProviderNames(): string[] {
  return Object.keys(providers);
}

// Re-export LiqPay types for convenience
export type { LiqPayCheckoutParams, LiqPayCallbackData } from './liqpay';
export { mapStatus as liqpayMapStatus } from './liqpay';