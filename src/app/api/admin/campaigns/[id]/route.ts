import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import type { CampaignType, CampaignStatus } from '@prisma/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: {
        _count: { select: { messages: true } },
      },
    });

    if (!campaign) return apiNotFound('Campaign not found');
    return apiSuccess(campaign);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const existing = await db.campaign.findUnique({ where: { id } });
    if (!existing) return apiNotFound('Campaign not found');

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) data.type = body.type as CampaignType;
    if (body.subject !== undefined) data.subject = body.subject;
    if (body.body !== undefined) data.body = body.body;
    if (body.targetSegment !== undefined) data.targetSegment = body.targetSegment ?? null;
    if (body.channel !== undefined) data.channel = body.channel;
    if (body.status !== undefined) data.status = body.status as CampaignStatus;

    const campaign = await db.campaign.update({ where: { id }, data });
    return apiSuccess(campaign, 'Campaign updated');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await db.campaign.findUnique({ where: { id } });
    if (!existing) return apiNotFound('Campaign not found');
    if (existing.status !== 'draft') {
      return apiError('VALIDATION_ERROR', 'Only draft campaigns can be deleted', 400);
    }

    await db.campaign.delete({ where: { id } });
    return apiSuccess(null, 'Campaign deleted');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}