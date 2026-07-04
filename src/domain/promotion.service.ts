// ============================================================
// Domain Layer: Promotion Service
// ============================================================

import { db } from '@/lib/db';

export async function validatePromotion(code: string, subtotal: number) {
  const promo = await db.promotion.findFirst({ where: { code } });
  if (!promo) return { valid: false as const, error: 'Промокод не знайдено' };

  const now = new Date();
  if (promo.status !== 'active')
    return { valid: false as const, error: 'Акція неактивна' };
  if (now < promo.startDate || now > promo.endDate)
    return { valid: false as const, error: 'Термін дії промокоду закінчився' };
  if (promo.maxUses && promo.usedCount >= promo.maxUses)
    return { valid: false as const, error: 'Ліміт використань вичерпано' };
  if (promo.minOrder && subtotal < promo.minOrder)
    return { valid: false as const, error: `Мінімальна сума замовлення: ${promo.minOrder} грн` };

  let calculatedDiscount = 0;
  if (promo.type === 'percentage') calculatedDiscount = Math.round(subtotal * (promo.value / 100) * 100) / 100;
  else if (promo.type === 'fixed') calculatedDiscount = promo.value;
  else if (promo.type === 'free_delivery') calculatedDiscount = 0;

  return {
    valid: true as const,
    promotion: {
      id: promo.id,
      name: promo.name,
      type: promo.type,
      value: promo.value,
      discount: calculatedDiscount,
      freeDelivery: promo.type === 'free_delivery',
      description: promo.description,
    },
  };
}

export async function getActivePromotions() {
  const now = new Date();
  return db.promotion.findMany({
    where: { status: 'active', startDate: { lte: now }, endDate: { gte: now } },
    orderBy: [{ startDate: 'desc' }],
  });
}