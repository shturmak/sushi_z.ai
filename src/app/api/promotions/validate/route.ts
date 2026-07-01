import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenant, tenantCatch } from '@/lib/tenant-middleware';

export async function POST(request: NextRequest) {
  try {
    const ctx = await withTenant(request);
    const body = await request.json();
    const { code, subtotal } = body;

    if (!code) return apiError('VALIDATION_ERROR', 'Promotion code is required');
    if (!subtotal || subtotal <= 0) return apiError('VALIDATION_ERROR', 'Subtotal must be positive');

    const promo = await db.promotion.findUnique({ where: { code } });

    // Verify promotion belongs to current brand
    if (!promo || promo.brandId !== ctx.brandId) {
      return apiError('PROMO_INVALID', 'Промокод не знайдено');
    }

    const now = new Date();
    if (promo.status !== 'active')
      return apiError('PROMO_INVALID', 'Акція неактивна');
    if (now < promo.startDate || now > promo.endDate)
      return apiError('PROMO_INVALID', 'Термін дії промокоду закінчився');
    if (promo.maxUses && promo.usedCount >= promo.maxUses)
      return apiError('PROMO_INVALID', 'Ліміт використань вичерпано');
    if (promo.minOrder && subtotal < promo.minOrder)
      return apiError('PROMO_INVALID', `Мінімальна сума замовлення: ${promo.minOrder} грн`);

    let calculatedDiscount = 0;
    if (promo.type === 'percentage') calculatedDiscount = Math.round(subtotal * (promo.value / 100) * 100) / 100;
    else if (promo.type === 'fixed') calculatedDiscount = promo.value;
    else if (promo.type === 'free_delivery') calculatedDiscount = 0;

    return apiSuccess({
      id: promo.id,
      name: promo.name,
      type: promo.type,
      value: promo.value,
      discount: calculatedDiscount,
      freeDelivery: promo.type === 'free_delivery',
      description: promo.description,
    });
  } catch (err) {
    return tenantCatch(err);
  }
}