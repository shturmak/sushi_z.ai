import { apiSuccess } from '@/lib/api-response';
import { getActivePromotions } from '@/domain/promotion.service';

export async function GET() {
  try {
    const promotions = await getActivePromotions();
    return apiSuccess(promotions);
  } catch (error) {
    console.error('List promotions error:', error);
    return apiSuccess([]);
  }
}