import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiForbidden } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Brands list is small — return simple array, no pagination
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const search = request.nextUrl.searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
      ];
    }

    const brands = await db.brand.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

    return apiSuccess(brands);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await requireAdmin();
    if (payload.role !== 'super_admin') {
      return apiForbidden('Super admin access required');
    }

    const body = await request.json();
    const {
      name,
      slug,
      logoUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      description,
      slogan,
      isActive,
    } = body;

    if (!name) return apiError('VALIDATION_ERROR', 'name is required');

    const brandSlug = slug || generateSlug(name);

    // Check slug uniqueness
    const existing = await db.brand.findUnique({ where: { slug: brandSlug } });
    if (existing) return apiError('VALIDATION_ERROR', 'Brand with this slug already exists');

    const brand = await db.brand.create({
      data: {
        name,
        slug: brandSlug,
        logoUrl: logoUrl ?? null,
        primaryColor: primaryColor ?? '#e11d48',
        secondaryColor: secondaryColor ?? null,
        accentColor: accentColor ?? null,
        description: description ?? null,
        slogan: slogan ?? null,
        isActive: isActive ?? true,
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

    return apiSuccess(brand, 'Brand created', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Create brand error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}