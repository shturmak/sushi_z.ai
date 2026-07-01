import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api-response';
import { db } from './db';
import { verifyAccessToken } from './auth';
import type { TenantContext, TenantAuthContext } from './tenant';

// ──────────────────────────────────────────────────────────────────────
//  Brand resolution helpers
// ──────────────────────────────────────────────────────────────────────

const DEFAULT_BRAND_SLUG = 'default';

async function resolveBrand(slug?: string | null) {
  let brandSlug = slug;
  if (!brandSlug) {
    const headersList = await headers();
    brandSlug = headersList.get('x-brand-slug');
  }

  const where = brandSlug
    ? { slug: brandSlug, isActive: true }
    : { slug: DEFAULT_BRAND_SLUG, isActive: true };

  const brand = await db.brand.findFirst({ where });
  if (!brand) {
    const fallback = await db.brand.findFirst({ where: { isActive: true } });
    if (!fallback) throw await apiError('NO_BRAND', 'No active brand found', 404);
    return fallback;
  }
  return brand;
}

function brandToCtx(brand: { id: string; name: string; slug: string; logoUrl: string | null; primaryColor: string | null; secondaryColor: string | null; accentColor: string | null; heroBannerUrl: string | null; promoBannerUrls: string | null; description: string | null; slogan: string | null; isActive: boolean }) {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logoUrl: brand.logoUrl,
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor,
    accentColor: brand.accentColor,
    heroBannerUrl: brand.heroBannerUrl,
    promoBannerUrls: brand.promoBannerUrls,
    description: brand.description,
    slogan: brand.slogan,
    isActive: brand.isActive,
  };
}

// ──────────────────────────────────────────────────────────────────────
//  Public tenant middleware (no auth)
// ──────────────────────────────────────────────────────────────────────

export async function withTenant(request?: Request): Promise<TenantContext> {
  let brandSlug: string | null = null;
  if (request) {
    const url = new URL(request.url);
    brandSlug = url.searchParams.get('brand');
  }
  const brand = await resolveBrand(brandSlug);
  return { brandId: brand.id, brand: brandToCtx(brand) };
}

// ──────────────────────────────────────────────────────────────────────
//  Authenticated tenant middleware (customer-facing)
// ──────────────────────────────────────────────────────────────────────

export async function withTenantAuth(request?: Request): Promise<TenantAuthContext> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw await apiUnauthorized('Authentication required');
  }

  const token = authHeader.slice(7);
  const user = verifyAccessToken(token);
  if (!user) {
    throw await apiUnauthorized('Invalid or expired token');
  }

  let brandSlug: string | null = null;
  if (request) {
    const url = new URL(request.url);
    brandSlug = url.searchParams.get('brand');
  }

  const brand = await resolveBrand(brandSlug);

  return {
    brandId: brand.id,
    brand: brandToCtx(brand),
    user: {
      userId: user.userId,
      role: user.role,
      phone: user.phone,
      email: user.email,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
//  Admin tenant middleware
//  Returns TenantContext & { userId: string }.
//
//  - `super_admin`: reads brandId from query param `?brandId=...`
//  - `admin`/`manager`: reads brandId from their `User.brandId` field
// ──────────────────────────────────────────────────────────────────────

export async function withTenantAdmin(
  request: NextRequest,
): Promise<TenantContext & { userId: string }> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw await apiUnauthorized('Authentication required');
  }

  const token = authHeader.slice(7);
  const user = verifyAccessToken(token);
  if (!user) {
    throw await apiUnauthorized('Invalid or expired token');
  }

  if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'super_admin') {
    throw await apiForbidden('Admin access required');
  }

  let brandId: string | null = null;

  if (user.role === 'super_admin') {
    const { searchParams } = new URL(request.url);
    brandId = searchParams.get('brandId');
    if (!brandId) {
      throw await apiError('VALIDATION_ERROR', 'brandId query param required for super_admin', 400);
    }
  } else {
    const adminUser = await db.user.findUnique({
      where: { id: user.userId },
      select: { brandId: true },
    });
    if (!adminUser?.brandId) {
      throw await apiForbidden('No brand assigned to this admin user');
    }
    brandId = adminUser.brandId;
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand) {
    throw await apiNotFound('Brand not found');
  }

  return { brandId: brand.id, userId: user.userId };
}

// ──────────────────────────────────────────────────────────────────────
//  Standard catch handler for tenant-aware routes.
// ──────────────────────────────────────────────────────────────────────

export function tenantCatch(err: unknown): Response {
  if (err && typeof err === 'object' && 'status' in err) {
    return err as Response;
  }
  console.error('[Tenant]', err);
  return apiError('INTERNAL_ERROR', 'Internal server error', 500);
}