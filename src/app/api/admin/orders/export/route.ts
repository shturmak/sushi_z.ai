import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-middleware';
import { OrderStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const status = request.nextUrl.searchParams.get('status');
    const branchId = request.nextUrl.searchParams.get('branchId');
    const dateFrom = request.nextUrl.searchParams.get('dateFrom');
    const dateTo = request.nextUrl.searchParams.get('dateTo');

    const where: Record<string, unknown> = {};
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) where.status = status;
    if (branchId) where.branchId = branchId;
    if (dateFrom || dateTo) {
      const createdAt: Record<string, unknown> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        createdAt.lte = to;
      }
      where.createdAt = createdAt;
    }

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
        branch: { select: { name: true } },
        items: { select: { quantity: true } },
        payments: { select: { method: true } },
      },
    });

    // Build CSV with UTF-8 BOM and semicolon delimiter
    const BOM = '\uFEFF';
    const DELIMITER = ';';
    const header = [
      'Order #',
      'Date',
      'Customer',
      'Branch',
      'Type',
      'Status',
      'Items Count',
      'Subtotal',
      'Discount',
      'Total',
      'Payment Method',
      'Note',
    ].join(DELIMITER);

    const escape = (val: string | null | undefined): string => {
      if (val == null) return '';
      const str = String(val);
      if (str.includes(DELIMITER) || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = orders.map((order) => {
      const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const discount = order.total < (order.subtotal ?? 0) ? ((order.subtotal ?? 0) - order.total) : 0;
      return [
        escape(order.orderNumber),
        escape(order.createdAt.toISOString()),
        escape(`${order.user.firstName} ${order.user.lastName}`),
        escape(order.branch.name),
        escape(order.type),
        escape(order.status),
        String(itemsCount),
        String(order.subtotal ?? 0),
        String(discount),
        String(order.total),
        escape(order.payments[0]?.method ?? 'cash'),
        escape(order.note),
      ].join(DELIMITER);
    });

    const csv = BOM + header + '\n' + rows.join('\n');

    const today = new Date().toISOString().split('T')[0];
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-${today}.csv"`,
      },
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Admin orders CSV export error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Export failed' } },
      { status: 500 },
    );
  }
}