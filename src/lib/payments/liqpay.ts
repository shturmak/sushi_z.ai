// ============================================================
// LiqPay Payment Provider — Ukrainian Market
// ============================================================
// Uses Base64-encoded JSON + SHA1 signature flow.
// Compatible with both Edge and Node.js runtimes via Web Crypto API.
// ============================================================

// ── Types ──────────────────────────────────────────────────

export interface LiqPayCheckoutParams {
  amount: number;
  orderId: string; // Our internal payment ID
  description: string;
  resultUrl: string; // Frontend URL to redirect after payment
}

export interface LiqPayCheckoutResult {
  data: string; // Base64 encoded JSON
  signature: string; // SHA1 signature
  checkoutUrl: string; // Full LiqPay checkout URL
}

export interface LiqPayCallbackData {
  public_key: string;
  version: string;
  action: string;
  amount: string;
  currency: string;
  description: string;
  order_id: string;
  status: string; // success | failure | wait | reversed | error
  transaction_id: string;
  sender_phone: string;
  paytype: string;
  sender_card_mask2: string;
  sender_card_bank: string;
  sender_card_type: string;
  sender_card_country: string;
  ip: string;
  commission_credit: string;
  commission_debit: string;
  agent_commission: string;
  amount_debit: string;
  amount_credit: string;
  currency_debit: string;
  currency_credit: string;
  sender_bonus: string;
  receiver_bonus: string;
  liqpay_order_id: string;
  [key: string]: string;
}

// Internal statuses matching our PaymentStatus enum in Prisma
export type MappedPaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded';

// ── Config ─────────────────────────────────────────────────

function getPublicKey(): string {
  const key = process.env.LIQPAY_PUBLIC_KEY;
  if (!key) throw new Error('LIQPAY_PUBLIC_KEY is not configured');
  return key;
}

function getPrivateKey(): string {
  const key = process.env.LIQPAY_PRIVATE_KEY;
  if (!key) throw new Error('LIQPAY_PRIVATE_KEY is not configured');
  return key;
}

const LIQPAY_CHECKOUT_URL = 'https://www.liqpay.ua/api/3/checkout';

// ── SHA1 via Web Crypto API ───────────────────────────────
// Works in both Edge runtime and Node.js (globalThis.crypto)

async function sha1(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Base64 (URL-safe, works in all runtimes) ──────────────

function base64Encode(input: string): string {
  // Node.js Buffer is available in server context
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf-8').toString('base64');
  }
  // Fallback for Edge runtime
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64Decode(input: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'base64').toString('utf-8');
  }
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// ── Core Functions ─────────────────────────────────────────

/**
 * Generate a LiqPay checkout: encodes params as base64 JSON and
 * produces the SHA1 signature for the redirect flow.
 */
export async function createCheckout(
  params: LiqPayCheckoutParams,
): Promise<LiqPayCheckoutResult> {
  const publicKey = getPublicKey();
  const privateKey = getPrivateKey();

  const payload = {
    public_key: publicKey,
    version: '3',
    action: 'pay',
    amount: params.amount.toFixed(2),
    currency: 'UAH',
    description: params.description,
    order_id: params.orderId,
    result_url: params.resultUrl,
    // server_url will be set by the webhook route handler
    server_url: getServerCallbackUrl(),
  };

  const jsonStr = JSON.stringify(payload);
  const data = base64Encode(jsonStr);
  const signature = await sha1(privateKey + data + privateKey);

  return {
    data,
    signature,
    checkoutUrl: LIQPAY_CHECKOUT_URL,
  };
}

/**
 * Verify and decode a LiqPay callback (server_url POST).
 * Returns the decoded data if signature is valid, null otherwise.
 */
export async function verifyCallback(
  data: string,
  signature: string,
): Promise<LiqPayCallbackData | null> {
  if (!data || !signature) {
    console.error('[LIQPAY] Missing data or signature in callback');
    return null;
  }

  const privateKey = getPrivateKey();
  const expectedSignature = await sha1(privateKey + data + privateKey);

  if (signature !== expectedSignature) {
    console.error(
      '[LIQPAY] Signature mismatch. Expected:',
      expectedSignature,
      'Received:',
      signature,
    );
    return null;
  }

  try {
    const jsonStr = base64Decode(data);
    const parsed = JSON.parse(jsonStr) as LiqPayCallbackData;
    return parsed;
  } catch (err) {
    console.error('[LIQPAY] Failed to decode callback data:', err);
    return null;
  }
}

/**
 * Map LiqPay's status string to our internal PaymentStatus enum.
 *
 * LiqPay statuses: success, failure, wait, reversed, error, subscriber, codeverif
 * Our statuses:    pending, processing, succeeded, failed, refunded
 */
export function mapStatus(liqpayStatus: string): MappedPaymentStatus {
  switch (liqpayStatus) {
    case 'success':
    case 'subscriber':
      return 'succeeded';

    case 'reversed':
      return 'refunded';

    case 'failure':
    case 'error':
      return 'failed';

    case 'wait':
    case 'codeverif':
      return 'processing';

    default:
      console.warn(`[LIQPAY] Unknown status "${liqpayStatus}", mapping to pending`);
      return 'pending';
  }
}

// ── Helpers ────────────────────────────────────────────────

/**
 * Build the server_url (callback URL) from environment or detect from request headers.
 * This is used in the checkout payload so LiqPay knows where to POST the callback.
 */
function getServerCallbackUrl(): string {
  // Allow explicit override
  if (process.env.LIQPAY_SERVER_URL) {
    return process.env.LIQPAY_SERVER_URL;
  }

  // Default: derive from NEXT_PUBLIC base URL or fallback
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
  if (!baseUrl) {
    // In development, provide a reasonable default
    console.warn(
      '[LIQPAY] LIQPAY_SERVER_URL and NEXT_PUBLIC_APP_URL are not set. ' +
        'Webhook callbacks may not work. Set LIQPAY_SERVER_URL explicitly.',
    );
    return 'http://localhost:3000/api/payments/webhook/liqpay';
  }

  return `${baseUrl.replace(/\/+$/, '')}/api/payments/webhook/liqpay`;
}