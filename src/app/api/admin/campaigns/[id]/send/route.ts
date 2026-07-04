import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { Prisma } from '@prisma/client';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const campaign = await db.campaign.findUnique({ where: { id } });
    if (!campaign) return apiNotFound('Campaign not found');
    if (campaign.status !== 'draft') {
      return apiError('VALIDATION_ERROR', 'Only draft campaigns can be sent', 400);
    }

    const brandId = campaign.brandId;
    const segment = campaign.targetSegment;
    const now = new Date();

    // Build the user query based on targetSegment
    let userIds: string[] = [];

    if (segment === 'all') {
      // All users who have at least one order for this brand
      const rows = await db.order.groupBy({
        by: ['userId'],
        where: { brandId },
      });
      userIds = rows.map((r) => r.userId);
    } else if (segment === 'new') {
      // Users with exactly 1 order for this brand
      const rows = await db.order.groupBy({
        by: ['userId'],
        where: { brandId },
        _count: { userId: true },
        having: { userId: { count: 1 } },
      });
      userIds = rows.map((r) => r.userId);
    } else if (segment === 'inactive_7d') {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const rows = await db.order.groupBy({
        by: ['userId'],
        where: { brandId },
        _max: { createdAt: true },
        having: {
          createdAt: { _max: { lt: cutoff } },
        },
      });
      userIds = rows.map((r) => r.userId);
    } else if (segment === 'inactive_14d') {
      const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const rows = await db.order.groupBy({
        by: ['userId'],
        where: { brandId },
        _max: { createdAt: true },
        having: {
          createdAt: { _max: { lt: cutoff } },
        },
      });
      userIds = rows.map((r) => r.userId);
    } else if (segment === 'inactive_30d') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const rows = await db.order.groupBy({
        by: ['userId'],
        where: { brandId },
        _max: { createdAt: true },
        having: {
          createdAt: { _max: { lt: cutoff } },
        },
      });
      userIds = rows.map((r) => r.userId);
    } else if (segment === 'high_value') {
      // Users with total spent > 2000 for this brand
      const rows = await db.order.groupBy({
        by: ['userId'],
        where: { brandId },
        _sum: { total: true },
        having: {
          total: { _sum: { gt: 2000 } },
        },
      });
      userIds = rows.map((r) => r.userId);
    } else {
      // Fallback: all users with orders for this brand
      const rows = await db.order.groupBy({
        by: ['userId'],
        where: { brandId },
      });
      userIds = rows.map((r) => r.userId);
    }

    const sentCount = userIds.length;

    // Create CampaignMessage records in batches
    const batchSize = 100;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      await db.campaignMessage.createMany({
        data: batch.map((userId) => ({
          campaignId: id,
          userId,
          channel: campaign.channel,
          status: 'sent',
          sentAt: now,
        })),
      });
    }

    // Update campaign
    await db.campaign.update({
      where: { id },
      data: {
        status: 'completed',
        sentCount,
        startedAt: now,
        completedAt: now,
      },
    });

    return apiSuccess({ sent: sentCount, message: `Campaign sent to ${sentCount} recipients` });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Send campaign DB error:', error.message);
    }
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Send campaign error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to send campaign', 500);
  }
}