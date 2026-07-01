import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) return apiError('VALIDATION_ERROR', 'orderId is required');

    const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order) return apiError('NOT_FOUND', 'Order not found', 404);
    if (order.userId !== authUser.userId) return apiError('FORBIDDEN', 'Forbidden', 403);

    const payment = await db.payment.findFirst({ where: { orderId, method: 'card' } });
    if (!payment) return apiError('NO_CARD_PAYMENT', 'No card payment for this order');

    if (payment.status === 'succeeded') {
      return apiError('ALREADY_PAID', 'Payment already completed');
    }

    // Simulate creating a payment intent (in production: call LiqPay/Stripe/Portmone)
    const providerTxId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'processing', providerTxId },
    });

    return apiSuccess({
      paymentId: payment.id,
      providerTxId,
      amount: payment.amount,
      // In production: redirect URL to payment provider
      paymentUrl: `https://payment-provider.example.com/pay/${providerTxId}`,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Payment intent error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to create payment intent', 500);
  }
}