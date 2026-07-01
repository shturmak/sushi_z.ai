import { db } from '@/lib/db';

export async function getAdminAnalytics() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const notCancelled = { status: { not: 'cancelled' } };

  const [ordersToday, ordersWeek, ordersMonth, revToday, revWeek, revMonth, statusDistribution, topProducts, recentOrders] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: todayStart } } }),
    db.order.count({ where: { createdAt: { gte: weekStart } } }),
    db.order.count({ where: { createdAt: { gte: monthStart } } }),
    db.order.aggregate({ _sum: { total: true }, where: { ...notCancelled, createdAt: { gte: todayStart } } }),
    db.order.aggregate({ _sum: { total: true }, where: { ...notCancelled, createdAt: { gte: weekStart } } }),
    db.order.aggregate({ _sum: { total: true }, where: { ...notCancelled, createdAt: { gte: monthStart } } }),
    db.order.groupBy({ by: ['status'], _count: { status: true } }),
    db.orderItem.groupBy({ by: ['productName', 'productId'], _sum: { quantity: true, totalPrice: true }, orderBy: { _sum: { totalPrice: 'desc' } }, take: 5 }),
    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
        branch: { select: { name: true } },
        items: { select: { id: true, productName: true, quantity: true } },
      },
    }),
  ]);

  return {
    orders: { today: ordersToday, week: ordersWeek, month: ordersMonth },
    revenue: { today: revToday._sum.total ?? 0, week: revWeek._sum.total ?? 0, month: revMonth._sum.total ?? 0 },
    statusDistribution: statusDistribution.map(s => ({ status: s.status, count: s._count.status })),
    topProducts: topProducts.map(p => ({ name: p.productName, quantity: p._sum.quantity, revenue: p._sum.totalPrice })),
    recentOrders,
  };
}