import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess } from '@/lib/api-response';
import { withTenant, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest) {
  try {
    const ctx = await withTenant(request);
    const { searchParams } = new URL(request.url);
    const isOpen = searchParams.get('isOpen');

    const where: Record<string, unknown> = { brandId: ctx.brandId };
    if (isOpen !== null && isOpen !== undefined) {
      where.isOpen = isOpen === 'true';
    }

    const branches = await db.branch.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return apiSuccess(branches);
  } catch (err) {
    return tenantCatch(err);
  }
}