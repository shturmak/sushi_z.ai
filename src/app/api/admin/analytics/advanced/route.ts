import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import type { AdvancedAnalytics } from '@/lib/admin-types';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const brandId = request.nextUrl.searchParams.get('brandId');
    if (!brandId) {
      return apiError('MISSING_PARAM', 'brandId is required', 400);
    }

    // ── Customer Segments ───────────────────────────────────
    // Get per-user order counts and total spent for this brand
    const userAgg = await db.$queryRawUnsafe<
      { userId: string; orderCount: number; totalSpent: number }[]
    >(
      `SELECT "userId", COUNT(*) as "orderCount", SUM("total") as "totalSpent"
       FROM orders
       WHERE "brandId" = ? AND "status" != 'cancelled'
       GROUP BY "userId"`,
      brandId,
    );

    const segments: AdvancedAnalytics['customerSegments'] = [];
    let newC: { count: number; totalSpent: number } = { count: 0, totalSpent: 0 };
    let retC: { count: number; totalSpent: number } = { count: 0, totalSpent: 0 };
    let loyalC: { count: number; totalSpent: number } = { count: 0, totalSpent: 0 };
    let highC: { count: number; totalSpent: number } = { count: 0, totalSpent: 0 };

    for (const u of userAgg) {
      const isHighValue = u.totalSpent > 2000;

      if (isHighValue) {
        highC.count++;
        highC.totalSpent += u.totalSpent;
      } else if (u.orderCount >= 6) {
        loyalC.count++;
        loyalC.totalSpent += u.totalSpent;
      } else if (u.orderCount >= 2 && u.orderCount <= 5) {
        retC.count++;
        retC.totalSpent += u.totalSpent;
      } else {
        newC.count++;
        newC.totalSpent += u.totalSpent;
      }
    }

    const seg = (label: string, c: { count: number; totalSpent: number }) => ({
      segment: label,
      count: c.count,
      totalSpent: Math.round(c.totalSpent * 100) / 100,
      avgCheck: c.count > 0 ? Math.round((c.totalSpent / c.count) * 100) / 100 : 0,
    });
    segments.push(seg('new', newC));
    segments.push(seg('returning_2_5', retC));
    segments.push(seg('loyal_6_plus', loyalC));
    segments.push(seg('high_value', highC));

    // ── Orders by Hour (0-23) ──────────────────────────────
    const hourRows = await db.$queryRawUnsafe<{ hour: string; count: number; revenue: number }[]>(
      `SELECT strftime('%H', "createdAt") as hour, COUNT(*) as count, SUM("total") as revenue
       FROM orders
       WHERE "brandId" = ? AND "status" != 'cancelled'
       GROUP BY strftime('%H', "createdAt")`,
      brandId,
    );

    const ordersByHour: AdvancedAnalytics['ordersByHour'] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0,
      revenue: 0,
    }));
    for (const r of hourRows) {
      const h = parseInt(r.hour, 10);
      if (h >= 0 && h <= 23) {
        ordersByHour[h] = {
          hour: h,
          count: r.count,
          revenue: Math.round((r.revenue ?? 0) * 100) / 100,
        };
      }
    }

    // ── Orders by Day of Week (1=Mon … 7=Sun) ─────────────
    const dayRows = await db.$queryRawUnsafe<{ dow: string; count: number; revenue: number }[]>(
      `SELECT strftime('%w', "createdAt") as dow, COUNT(*) as count, SUM("total") as revenue
       FROM orders
       WHERE "brandId" = ? AND "status" != 'cancelled'
       GROUP BY strftime('%w', "createdAt")`,
      brandId,
    );

    const ordersByDayOfWeek: AdvancedAnalytics['ordersByDayOfWeek'] = Array.from({ length: 7 }, (_, i) => ({
      day: i + 1, // 1=Mon
      count: 0,
      revenue: 0,
    }));
    for (const r of dayRows) {
      // SQLite %w: 0=Sun, 1=Mon, … 6=Sat → convert to 1=Mon, … 7=Sun
      const sqliteDow = parseInt(r.dow, 10);
      const day = sqliteDow === 0 ? 7 : sqliteDow; // shift Sun from 0 to 7
      if (day >= 1 && day <= 7) {
        ordersByDayOfWeek[day - 1] = {
          day,
          count: r.count,
          revenue: Math.round((r.revenue ?? 0) * 100) / 100,
        };
      }
    }

    // ── Checkout Funnel ────────────────────────────────────
    const carts = await db.cart.count({ where: { brandId } });
    const checkouts = await db.order.count({ where: { brandId } });
    const completed = await db.order.count({ where: { brandId, status: 'completed' } });

    // ── Repeat Rate ────────────────────────────────────────
    const totalCustomers = userAgg.length;
    const repeatCustomers = userAgg.filter((u) => u.orderCount >= 2).length;
    const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 10000) / 100 : 0;

    const data: AdvancedAnalytics = {
      customerSegments: segments,
      ordersByHour,
      ordersByDayOfWeek,
      checkoutFunnel: { carts, checkouts, completed },
      repeatRate,
      totalCustomers,
    };

    return apiSuccess(data);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Advanced analytics error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch advanced analytics', 500);
  }
}