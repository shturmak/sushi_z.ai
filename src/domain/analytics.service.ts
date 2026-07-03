import { db } from '@/lib/db';

export interface AnalyticsDateRange {
  dateFrom?: Date;
  dateTo?: Date;
}

export async function getAdminAnalytics(range?: AnalyticsDateRange) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const notCancelled = { status: { not: 'cancelled' } };

  // Determine the effective date range for filtering charts / top products / status dist
  const rangeFrom = range?.dateFrom;
  const rangeTo = range?.dateTo;
  const chartFrom = rangeFrom || weekStart;
  const chartTo = rangeTo || now;

  const chartDateFilter: Record<string, unknown> = { createdAt: { gte: chartFrom } };
  if (rangeTo) {
    const endOfDay = new Date(rangeTo);
    endOfDay.setHours(23, 59, 59, 999);
    chartDateFilter.createdAt = { gte: chartFrom, lte: endOfDay };
  }

  const [ordersToday, ordersWeek, ordersMonth, revToday, revWeek, revMonth, rangeOrders, rangeRevenue, statusDistribution, topProducts, recentOrders, ordersInRange] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: todayStart } } }),
    db.order.count({ where: { createdAt: { gte: weekStart } } }),
    db.order.count({ where: { createdAt: { gte: monthStart } } }),
    db.order.aggregate({ _sum: { total: true }, where: { ...notCancelled, createdAt: { gte: todayStart } } }),
    db.order.aggregate({ _sum: { total: true }, where: { ...notCancelled, createdAt: { gte: weekStart } } }),
    db.order.aggregate({ _sum: { total: true }, where: { ...notCancelled, createdAt: { gte: monthStart } } }),
    db.order.count({ where: chartDateFilter }),
    db.order.aggregate({ _sum: { total: true }, where: { ...notCancelled, ...chartDateFilter } }),
    db.order.groupBy({ by: ['status'], where: chartDateFilter, _count: { status: true } }),
    db.orderItem.groupBy({
      by: ['productName', 'productId'],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 5,
      where: {
        order: chartDateFilter,
      },
    }),
    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
        branch: { select: { name: true } },
        items: { select: { id: true, productName: true, quantity: true } },
      },
    }),
    // Fetch orders in range for chart grouping
    db.order.findMany({
      where: chartDateFilter,
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Build ordersByDay from the fetched orders
  const dayMap = new Map<string, { count: number; revenue: number }>();
  for (const order of ordersInRange) {
    const day = order.createdAt.toISOString().split('T')[0];
    const existing = dayMap.get(day) || { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += order.total;
    dayMap.set(day, existing);
  }

  const ordersByDay: Array<{ date: string; count: number; revenue: number }> = [];
  const cursor = new Date(chartFrom);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(chartTo);
  end.setHours(23, 59, 59, 999);
  while (cursor <= end) {
    const key = cursor.toISOString().split('T')[0];
    const dayData = dayMap.get(key);
    ordersByDay.push({ date: key, count: dayData?.count ?? 0, revenue: dayData?.revenue ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Compute revenueByCategory from order items joined with product categories
  const categoryRevenue = await db.$queryRawUnsafe<Array<{ category: string; revenue: bigint }>>(`
    SELECT c."name" as category, COALESCE(SUM(oi."totalPrice"), 0) as revenue
    FROM "OrderItem" oi
    JOIN "Product" p ON oi."productId" = p."id"
    LEFT JOIN "Category" c ON p."categoryId" = c."id"
    JOIN "Order" o ON oi."orderId" = o."id"
    WHERE o."createdAt" >= '${chartFrom.toISOString()}'
    ${rangeTo ? `AND o."createdAt" <= '${new Date(rangeTo.getTime() + 86400000).toISOString()}'` : ''}
    GROUP BY c."name"
    ORDER BY revenue DESC
    LIMIT 6
  `);

  const revenueByCategory = categoryRevenue.map(row => ({
    category: row.category || 'Other',
    revenue: Number(row.revenue),
  }));

  return {
    orders: { today: ordersToday, week: ordersWeek, month: ordersMonth, range: rangeOrders },
    revenue: { today: revToday._sum.total ?? 0, week: revWeek._sum.total ?? 0, month: revMonth._sum.total ?? 0, range: rangeRevenue._sum.total ?? 0 },
    statusDistribution: statusDistribution.map(s => ({ status: s.status, count: s._count.status })),
    topProducts: topProducts.map(p => ({ name: p.productName, quantity: p._sum.quantity, revenue: p._sum.totalPrice })),
    recentOrders,
    ordersByDay,
    revenueByCategory,
  };
}