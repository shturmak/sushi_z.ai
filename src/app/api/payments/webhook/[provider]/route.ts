import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProvider } from '@/lib/payments';

// ── Route segment config ──────────────────────────────────
// Webhooks must be publicly accessible (no auth).
// LiqPay sends POST with application/x-www-form-urlencoded or application/json.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerName } = await params;

  try {
    // ── Parse body: LiqPay sends form-encoded by default ──
    let body: unknown;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await request.json();
    }

    // ── Resolve provider from registry ──
    const provider = getProvider(providerName);

    if (!provider) {
      // Fallback: keep legacy behavior for unknown/unregistered providers
      return handleLegacyWebhook(body as Record<string, unknown>);
    }

    // ── Verify signature & extract data ──
    const result = await provider.verifyCallback(body);

    if (!result.valid) {
      console.error(
        `[WEBHOOK:${providerName}] Invalid or unverified callback`,
        body,
      );
      return new NextResponse('INVALID_SIGNATURE', { status: 400 });
    }

    // ── Find payment by our internal ID (LiqPay order_id = payment.id) ──
    const payment = await db.payment.findUnique({
      where: { id: result.orderId },
    });

    if (!payment) {
      console.error(
        `[WEBHOOK:${providerName}] Unknown payment id: ${result.orderId}`,
      );
      return new NextResponse('UNKNOWN_ORDER', { status: 404 });
    }

    // ── Update payment ──
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: result.status,
        providerTxId: result.providerTxId,
        providerPayload: JSON.stringify(result.rawPayload),
      },
    });

    console.log(
      `[WEBHOOK:${providerName}] ${payment.id} → ${result.status} (tx: ${result.providerTxId})`,
    );

    // ── Auto-confirm order on successful payment ──
    if (result.status === 'succeeded' && payment.orderId) {
      const order = await db.order.findUnique({ where: { id: payment.orderId } });
      if (order && order.status === 'new') {
        await db.order.update({
          where: { id: payment.orderId },
          data: { status: 'confirmed', confirmedAt: new Date() },
        });
        console.log(
          `[WEBHOOK:${providerName}] Auto-confirmed order ${order.orderNumber}`,
        );
      }
    }

    // LiqPay expects a simple response — just return 200 with a string
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error(`[WEBHOOK:${providerName}] Processing error:`, error);
    // Return 200 to prevent LiqPay from retrying on our internal errors
    return new NextResponse('ERROR', { status: 200 });
  }
}

// ── Legacy fallback for non-registered providers ──────────
// Preserves the original behavior: raw body with providerTxId + status

async function handleLegacyWebhook(
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const { providerTxId, status } = body;

  if (!providerTxId || !status || typeof providerTxId !== 'string' || typeof status !== 'string') {
    console.error('[WEBHOOK:legacy] Missing providerTxId or status', body);
    return NextResponse.json({ received: false, reason: 'Missing fields' }, { status: 400 });
  }

  const payment = await db.payment.findFirst({
    where: { providerTxId },
  });
  if (!payment) {
    console.error(`[WEBHOOK:legacy] Unknown tx: ${providerTxId}`);
    return NextResponse.json({ received: false, reason: 'Unknown transaction' });
  }

  const newStatus =
    status === 'success'
      ? 'succeeded'
      : status === 'failure'
        ? 'failed'
        : 'pending';

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
      console.log(`[WEBHOOK:legacy] Auto-confirmed order ${order.orderNumber}`);
    }
  }

  console.log(`[WEBHOOK:legacy] ${providerTxId} → ${newStatus}`);
  return NextResponse.json({ received: true });
}