import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const translation = await db.menuTranslation.findUnique({ where: { id } });
    if (!translation) return apiNotFound('Translation not found');

    // Fetch original name
    let originalName = '';
    if (translation.entityType === 'Product') {
      const p = await db.product.findUnique({ where: { id: translation.entityId }, select: { name: true } });
      originalName = p?.name ?? '';
    } else if (translation.entityType === 'Category') {
      const c = await db.category.findUnique({ where: { id: translation.entityId }, select: { name: true } });
      originalName = c?.name ?? '';
    }

    return apiSuccess({ ...translation, originalName });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await db.menuTranslation.findUnique({ where: { id } });
    if (!existing) return apiNotFound('Translation not found');

    const body = await request.json();
    const { name, description } = body;

    const updated = await db.menuTranslation.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name || null }),
        ...(description !== undefined && { description: description || null }),
      },
    });

    return apiSuccess(updated, 'Translation updated');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await db.menuTranslation.findUnique({ where: { id } });
    if (!existing) return apiNotFound('Translation not found');

    await db.menuTranslation.delete({ where: { id } });
    return apiSuccess(null, 'Translation deleted');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}