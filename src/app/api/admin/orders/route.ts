import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenantAdmin, tenantCatch } from '@/lib/tenant-middleware';
import { OrderStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const ctx = await withTenantAdmin(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const branchId = searchParams.get('branchId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    // Get all branch IDs for this brand to filter orders
    const brandBranches = await db.branch.findMany({ where: { brandId: ctx.brandId }, select: { id: true } });
    const brandBranchIds = brandBranches.map(b => b.id);

    const where: Record<string, unknown> = { branchId: { in: brandBranchIds } };
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) where.status = status;
    if (branchId) {
      if (!brandBranchIds.includes(branchId)) return apiError('FORBIDDEN', 'Branch does not belong to your brand', 403);
      where.branchId = branchId;
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { firstName: true, lastName: true, phone: true, email: true } },
          branch: { select: { name: true, address: true } },
          items: { select: { productName: true, quantity: true, totalPrice: true } },
          payments: { select: { method: true, status: true } },
        },
      }),
      db.order.count({ where }),
    ]);

    return apiSuccess({ orders, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    return tenantCatch(err);
  }
}