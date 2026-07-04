import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound, apiForbidden } from '@/lib/api-response';
import { getAuthUser, requireAdmin } from '@/lib/auth-middleware';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const brand = await db.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            branches: true,
            products: true,
            orders: true,
          },
        },
      },
    });

    if (!brand) return apiNotFound('Brand not found');
    return apiSuccess(brand);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    if (user.role !== 'super_admin') {
      return apiForbidden('Super admin access required');
    }

    const { id } = await params;
    const body = await request.json();
    const { name, slug, logoUrl, primaryColor, secondaryColor, accentColor, description, slogan, isActive, currency, currencySymbol } = body;

    // Check brand exists
    const existing = await db.brand.findUnique({ where: { id } });
    if (!existing) return apiNotFound('Brand not found');

    // If slug is being changed, check uniqueness
    if (slug && slug !== existing.slug) {
      const slugTaken = await db.brand.findUnique({ where: { slug } });
      if (slugTaken) return apiError('VALIDATION_ERROR', 'Brand with this slug already exists');
    }

    const brand = await db.brand.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl ?? null }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor: secondaryColor ?? null }),
        ...(accentColor !== undefined && { accentColor: accentColor ?? null }),
        ...(description !== undefined && { description: description ?? null }),
        ...(slogan !== undefined && { slogan: slogan ?? null }),
        ...(isActive !== undefined && { isActive }),
        ...(currency !== undefined && { currency }),
        ...(currencySymbol !== undefined && { currencySymbol }),
      },
      include: {
        _count: {
          select: {
            branches: true,
            products: true,
            orders: true,
          },
        },
      },
    });

    return apiSuccess(brand, 'Brand updated');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Update brand error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    if (user.role !== 'super_admin') {
      return apiForbidden('Super admin access required');
    }

    const { id } = await params;

    const brand = await db.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            branches: true,
            products: true,
            orders: true,
          },
        },
      },
    });

    if (!brand) return apiNotFound('Brand not found');

    const { branches, products, orders } = brand._count;
    if (branches > 0 || products > 0 || orders > 0) {
      return apiError(
        'VALIDATION_ERROR',
        `Cannot delete brand: it has ${branches} branch(es), ${products} product(s), ${orders} order(s). Remove them first.`,
      );
    }

    await db.brand.delete({ where: { id } });
    return apiSuccess(null, 'Brand deleted');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Delete brand error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    if (user.role !== 'super_admin') {
      return apiForbidden('Super admin access required');
    }

    const { id } = await params;

    const brand = await db.brand.findUnique({ where: { id } });
    if (!brand) return apiNotFound('Brand not found');

    const updated = await db.brand.update({
      where: { id },
      data: { isActive: !brand.isActive },
      include: {
        _count: {
          select: {
            branches: true,
            products: true,
            orders: true,
          },
        },
      },
    });

    return apiSuccess(updated, `Brand ${updated.isActive ? 'activated' : 'deactivated'}`);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Toggle brand error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}