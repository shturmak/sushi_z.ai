import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getProvider } from '@/lib/payments';

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) return apiError('VALIDATION_ERROR', 'orderId is required');

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) return apiError('NOT_FOUND', 'Order not found', 404);
    if (order.userId !== authUser.userId) return apiError('FORBIDDEN', 'Forbidden', 403);

    const payment = await db.payment.findFirst({ where: { orderId, method: 'card' } });
    if (!payment) return apiError('NO_CARD_PAYMENT', 'No card payment for this order');

    if (payment.status === 'succeeded') {
      return apiError('ALREADY_PAID', 'Payment already completed');
    }

    // ── Resolve payment provider ──
    const providerName = process.env.PAYMENT_PROVIDER || 'liqpay';
    const provider = getProvider(providerName);

    if (!provider) {
      console.error(`[PAYMENT INTENT] Unknown provider: ${providerName}`);
      return apiError('PROVIDER_ERROR', `Payment provider "${providerName}" is not configured`, 500);
    }

    // Build description for LiqPay receipt line
    const description = `Order #${order.orderNumber}`;

    // Derive frontend result URL from request origin
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
    const resultUrl = `${origin}/payment/result?orderId=${orderId}`;

    // Mark payment as processing before calling provider
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'processing' },
    });

    // Generate provider checkout
    const checkout = await provider.createCheckout({
      amount: payment.amount,
      orderId: payment.id, // our internal payment ID — used as LiqPay order_id
      description,
      resultUrl,
    });

    return apiSuccess({
      paymentId: payment.id,
      amount: payment.amount,
      provider: providerName,
      data: checkout.data,
      signature: checkout.signature,
      checkoutUrl: checkout.checkoutUrl,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Payment intent error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to create payment intent', 500);
  }
}