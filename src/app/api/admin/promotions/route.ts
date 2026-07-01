import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET() {
  try {
    await requireAdmin();
    const promotions = await db.promotion.findMany({ orderBy: { createdAt: 'desc' } });
    return apiSuccess(promotions);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { code, name, description, type, value, minOrder, maxUses, startDate, endDate } = body;

    if (!name || !type || value == null || !startDate || !endDate)
      return apiError('VALIDATION_ERROR', 'name, type, value, startDate, endDate required');

    const promo = await db.promotion.create({
      data: { code: code || null, name, description, type, value, minOrder: minOrder ?? 0, maxUses: maxUses ?? null, startDate: new Date(startDate), endDate: new Date(endDate) },
    });
    return apiSuccess(promo, 'Promotion created', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Create promotion error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}