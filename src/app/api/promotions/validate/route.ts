import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { validatePromotion } from '@/domain/promotion.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, subtotal } = body;

    if (!code) return apiError('VALIDATION_ERROR', 'Promotion code is required');
    if (!subtotal || subtotal <= 0) return apiError('VALIDATION_ERROR', 'Subtotal must be positive');

    const result = await validatePromotion(code, subtotal);
    if (!result.valid) return apiError('PROMO_INVALID', result.error as string);

    return apiSuccess(result.promotion);
  } catch (error) {
    console.error('Validate promotion error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to validate promotion', 500);
  }
}