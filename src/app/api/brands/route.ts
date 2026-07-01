import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api-response';

/**
 * GET /api/brands
 * Public: returns a list of active brands with minimal public fields.
 */
export async function GET() {
  try {
    const brands = await db.brand.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
      },
      orderBy: { name: 'asc' },
    });

    return apiSuccess(brands);
  } catch (error) {
    console.error('List brands error:', error);
    return apiSuccess([]);
  }
}

/**
 * POST /api/brands
 * Super-admin only: create a new brand.
 *
 * Body (JSON):
 *   name          — required
 *   slug          — required, unique
 *   primaryColor  — required, hex
 *   secondaryColor — required, hex
 *   accentColor   — required, hex
 *   logoUrl       — optional
 *   heroBannerUrl — optional
 *   promoBannerUrls — optional (JSON string)
 *   description   — optional
 *   slogan        — optional
 */
export async function POST(request: NextRequest) {
  try {
    // --- Auth check ---
    let user;
    try {
      user = await requireAuth();
    } catch {
      return apiUnauthorized();
    }

    if (user.role !== 'super_admin') {
      return apiForbidden('Only super_admin can create brands');
    }

    // --- Parse body ---
    const body = await request.json();
    const { name, slug, primaryColor, secondaryColor, accentColor, logoUrl, heroBannerUrl, promoBannerUrls, description, slogan } = body;

    if (!name || !slug || !primaryColor || !secondaryColor || !accentColor) {
      return apiError('VALIDATION_ERROR', 'Fields name, slug, primaryColor, secondaryColor, accentColor are required', 400);
    }

    // Check slug uniqueness
    const existing = await db.brand.findUnique({ where: { slug } });
    if (existing) {
      return apiError('SLUG_TAKEN', `Brand with slug "${slug}" already exists`, 409);
    }

    // --- Create brand ---
    const brand = await db.brand.create({
      data: {
        name,
        slug,
        primaryColor,
        secondaryColor,
        accentColor,
        logoUrl: logoUrl ?? null,
        heroBannerUrl: heroBannerUrl ?? null,
        promoBannerUrls: promoBannerUrls ?? null,
        description: description ?? null,
        slogan: slogan ?? null,
        isActive: true,
      },
    });

    return apiSuccess(brand, 'Brand created', 201);
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      return error as Response;
    }
    console.error('Create brand error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to create brand', 500);
  }
}