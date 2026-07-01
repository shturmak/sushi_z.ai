import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess } from '@/lib/api-response';

// Webhook from payment provider (LiqPay, Portmone, etc.)
// In production: verify signature, validate payload
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerTxId, status } = body;

    if (!providerTxId || !status) {
      return apiSuccess({ received: false }, 'Missing providerTxId or status');
    }

    const payment = await db.payment.findUnique({ where: { providerTxId } });
    if (!payment) {
      console.error(`[PAYMENT WEBHOOK] Unknown tx: ${providerTxId}`);
      return apiSuccess({ received: false }, 'Unknown transaction');
    }

    const newStatus = status === 'success' ? 'succeeded' : status === 'failure' ? 'failed' : 'pending';
    await db.payment.update({
      where: { id: payment.id },
      data: { status: newStatus, providerPayload: JSON.stringify(body) },
    });

    // Auto-confirm order on successful payment
    if (newStatus === 'succeeded' && payment.orderId) {
      const order = await db.order.findUnique({ where: { id: payment.orderId } });
      if (order && order.status === 'new') {
        await db.order.update({
          where: { id: payment.orderId },
          data: { status: 'confirmed', confirmedAt: new Date() },
        });
        console.log(`[PAYMENT WEBHOOK] Auto-confirmed order ${order.orderNumber}`);
      }
    }

    console.log(`[PAYMENT WEBHOOK] ${providerTxId} → ${newStatus}`);
    return apiSuccess({ received: true });
  } catch (error) {
    console.error('Payment webhook error:', error);
    return apiSuccess({ received: false }, 'Webhook processing error');
  }
}