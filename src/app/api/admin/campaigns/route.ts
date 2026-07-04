import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { parsePagination, paginateResult } from '@/lib/pagination';
import type { CampaignType, CampaignStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const brandId = request.nextUrl.searchParams.get('brandId');
    const statusFilter = request.nextUrl.searchParams.get('status');
    const { page, limit } = parsePagination(request.nextUrl.searchParams, { limit: 50 });

    if (!brandId) return apiError('VALIDATION_ERROR', 'brandId is required', 400);

    const where: Record<string, unknown> = { brandId };
    if (statusFilter) {
      where.status = statusFilter as CampaignStatus;
    }

    const [campaigns, total] = await Promise.all([
      db.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { messages: true } },
        },
      }),
      db.campaign.count({ where }),
    ]);

    return apiSuccess(paginateResult(campaigns, total, page, limit));
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const brandId = request.nextUrl.searchParams.get('brandId');
    if (!brandId) return apiError('VALIDATION_ERROR', 'brandId is required', 400);

    const body = await request.json();
    const { name, type, subject, body: messageBody, targetSegment, channel } = body;

    if (!name || !type || !subject || !channel) {
      return apiError('VALIDATION_ERROR', 'name, type, subject, channel are required');
    }

    const campaign = await db.campaign.create({
      data: {
        brandId,
        name,
        type: type as CampaignType,
        subject,
        body: messageBody ?? '',
        targetSegment: targetSegment ?? null,
        channel,
        status: 'draft',
      },
    });

    return apiSuccess(campaign, 'Campaign created', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Create campaign error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}