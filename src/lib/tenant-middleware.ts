import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth-middleware';
import { TenantError, type TenantContext } from '@/lib/tenant';
import { resolveBrandFromPath, resolveBrandFromHost } from '@/lib/brand-resolver';
import { apiError } from '@/lib/api-response';

/**
 * Build a TenantContext from a brand DB record.
 */
function brandRecordToTenantContext(
  brand: Record<string, unknown>,
): TenantContext {
  return {
    brandId: brand.id as string,
    brand: {
      id: brand.id as string,
      name: brand.name as string,
      slug: brand.slug as string,
      logoUrl: (brand.logoUrl as string) ?? null,
      primaryColor: brand.primaryColor as string,
      secondaryColor: brand.secondaryColor as string,
      accentColor: brand.accentColor as string,
      heroBannerUrl: (brand.heroBannerUrl as string) ?? null,
      promoBannerUrls: (brand.promoBannerUrls as string) ?? null,
      description: (brand.description as string) ?? null,
      slogan: (brand.slogan as string) ?? null,
      isActive: brand.isActive as boolean,
    },
  };
}

/**
 * Fetch brand by ID and return TenantContext, or throw TenantError.
 */
async function fetchTenantContext(brandId: string): Promise<TenantContext> {
  const brand = await db.brand.findUnique({ where: { id: brandId } });

  if (!brand) {
    throw new TenantError('BRAND_NOT_FOUND', `Brand with id "${brandId}" not found`, 404);
  }

  if (!brand.isActive) {
    throw new TenantError('BRAND_INACTIVE', `Brand "${brand.name}" is not active`, 403);
  }

  return brandRecordToTenantContext(brand as unknown as Record<string, unknown>);
}

/**
 * For public routes — extract brand context from the request URL.
 *
 * Resolution order:
 * 1. Host-based slug (subdomain)
 * 2. Path-based slug (first segment)
 *
 * @throws TenantError if brand cannot be resolved or is inactive.
 */
export async function withTenant(request: NextRequest): Promise<TenantContext> {
  const url = new URL(request.url);

  // 1. Try host-based resolution
  const hostSlug = resolveBrandFromHost(url.hostname);
  if (hostSlug) {
    const brand = await db.brand.findUnique({ where: { slug: hostSlug } });
    if (brand) {
      if (!brand.isActive) {
        throw new TenantError('BRAND_INACTIVE', `Brand "${brand.name}" is not active`, 403);
      }
      return brandRecordToTenantContext(brand as unknown as Record<string, unknown>);
    }
  }

  // 2. Try path-based resolution
  const pathSlug = resolveBrandFromPath(url.pathname);
  if (pathSlug) {
    const brand = await db.brand.findUnique({ where: { slug: pathSlug } });
    if (brand) {
      if (!brand.isActive) {
        throw new TenantError('BRAND_INACTIVE', `Brand "${brand.name}" is not active`, 403);
      }
      return brandRecordToTenantContext(brand as unknown as Record<string, unknown>);
    }
  }

  // 3. Nothing found
  throw new TenantError(
    'BRAND_NOT_FOUND',
    'Unable to resolve brand from request URL. Include a brand slug in the path or use a branded subdomain.',
    404,
  );
}

/**
 * For authenticated routes — resolve brand from URL, but also verify
 * the authenticated user belongs to this brand (if user has a brandId).
 *
 * Falls back to URL-based resolution for super_admin users who may
 * manage multiple brands.
 */
export async function withTenantAuth(
  request: NextRequest,
): Promise<TenantContext & { userId: string; userRole: string }> {
  const user = await requireAuth();

  // Super admins can access any brand — resolve from URL
  if (user.role === 'super_admin') {
    const tenant = await withTenant(request);
    return { ...tenant, userId: user.userId, userRole: user.role };
  }

  // For other roles, look up the user's brandId from DB
  const dbUser = await db.user.findUnique({
    where: { id: user.userId },
    select: { brandId: true },
  });

  if (dbUser?.brandId) {
    // User has an assigned brand — use it directly
    const tenant = await fetchTenantContext(dbUser.brandId);
    return { ...tenant, userId: user.userId, userRole: user.role };
  }

  // No brandId on user — fall back to URL resolution
  const tenant = await withTenant(request);
  return { ...tenant, userId: user.userId, userRole: user.role };
}

/**
 * For admin routes — get brand context from the authenticated admin's
 * assigned brand. Admins must have a brandId on their user record.
 *
 * @throws TenantError if admin has no brand assigned.
 */
export async function withTenantAdmin(
  request: NextRequest,
): Promise<TenantContext & { userId: string }> {
  const user = await requireAdmin();

  // Super admins resolve from URL
  if (user.role === 'super_admin') {
    const tenant = await withTenant(request);
    return { ...tenant, userId: user.userId };
  }

  // Regular admins/managers must have a brandId
  const dbUser = await db.user.findUnique({
    where: { id: user.userId },
    select: { brandId: true },
  });

  if (!dbUser?.brandId) {
    throw new TenantError(
      'BRAND_NOT_ASSIGNED',
      'Admin user has no brand assigned. Contact super admin.',
      403,
    );
  }

  const tenant = await fetchTenantContext(dbUser.brandId);
  return { ...tenant, userId: user.userId };
}

/**
 * Utility: catch TenantError in a route handler and return proper API response.
 * Usage:
 *   try {
 *     const tenant = await withTenant(request);
 *     ...
 *   } catch (err) {
 *     return tenantCatch(err);
 *   }
 */
export function tenantCatch(err: unknown) {
  if (err instanceof TenantError) {
    return apiError(err.code, err.message, err.statusCode);
  }
  if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
    // Re-throw pre-built NextResponse errors from auth middleware
    return err as Response;
  }
  console.error('Tenant middleware error:', err);
  return apiError('INTERNAL_ERROR', 'Internal server error', 500);
}