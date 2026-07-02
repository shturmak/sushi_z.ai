import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api-response'
import { db } from './db'
import { verifyAccessToken } from './auth'
import type { TenantContext, TenantAuthContext } from './tenant'

// ── Brand resolution ────────────────────────────────────────────────

export async function resolveBrand(slug?: string) {
  // Priority: explicit slug > x-brand-slug header > first active brand
  let brandSlug: string | undefined = slug

  if (!brandSlug) {
    const headersList = await headers()
    brandSlug = headersList.get('x-brand-slug') || undefined
  }

  const brand = brandSlug
    ? await db.brand.findUnique({ where: { slug: brandSlug } })
    : await db.brand.findFirst({ where: { isActive: true } })

  if (!brand) {
    throw await apiNotFound('Бренд не знайдено')
  }

  return brand
}

// ── Convert Prisma brand to TenantContext shape ─────────────────────

export function brandToCtx(brand: {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  accentColor: string | null
  heroBannerUrl: string | null
  promoBannerUrls: string | null
  description: string | null
  slogan: string | null
  isActive: boolean
}): TenantContext['brand'] {
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
  }
}

// ── Public tenant context (no auth required) ────────────────────────

export async function withTenant(slug?: string): Promise<TenantContext> {
  const brand = await resolveBrand(slug)
  return {
    brandId: brand.id,
    brand: brandToCtx(brand),
  }
}

// ── Authenticated tenant context (requires Bearer token) ────────────

export async function withTenantAuth(slug?: string): Promise<TenantAuthContext> {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw await apiUnauthorized()
  }

  const token = authHeader.slice(7)
  const payload = await verifyAccessToken(token)

  if (!payload) {
    throw await apiUnauthorized('Токен недійсний або термін його дії закінчився')
  }

  const brand = await resolveBrand(slug)

  return {
    brandId: brand.id,
    brand: brandToCtx(brand),
    user: {
      userId: payload.userId,
      role: payload.role,
      phone: payload.phone,
      email: payload.email,
    },
  }
}

// ── Admin tenant context (admin auth + brand scoping) ───────────────

export async function withTenantAdmin(request: NextRequest): Promise<TenantContext & { userId: string }> {
  // 1. Authenticate via Bearer token
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw await apiUnauthorized()
  }

  const token = authHeader.slice(7)
  const payload = await verifyAccessToken(token)

  if (!payload) {
    throw await apiUnauthorized('Токен недійсний або термін його дії закінчився')
  }

  if (payload.role !== 'admin' && payload.role !== 'manager' && payload.role !== 'super_admin') {
    throw await apiForbidden('Адміністративний доступ необхідний')
  }

  // 2. Resolve brand based on role
  let brandId: string

  if (payload.role === 'super_admin') {
    // Super admin can specify brand via ?brandId query param
    brandId = request.nextUrl.searchParams.get('brandId') || ''
    if (!brandId) {
      // Fall back to first active brand
      const firstBrand = await db.brand.findFirst({ where: { isActive: true } })
      if (!firstBrand) {
        throw await apiNotFound('Жоден активний бренд не знайдено')
      }
      brandId = firstBrand.id
    }
  } else {
    // admin / manager — use their assigned brand
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { brandId: true },
    })
    if (!user?.brandId) {
      throw await apiForbidden('Користувач не прив\'язаний до бренду')
    }
    brandId = user.brandId
  }

  // 3. Load brand
  const brand = await db.brand.findUnique({ where: { id: brandId } })
  if (!brand) {
    throw await apiNotFound('Бренд не знайдено')
  }

  return {
    brandId: brand.id,
    brand: brandToCtx(brand),
    userId: payload.userId,
  }
}

// ── Standard error handler ──────────────────────────────────────────

export function tenantCatch(err: unknown): Response {
  // If the error is already a NextResponse (from apiError, apiUnauthorized, etc.), return it
  if (err && typeof err === 'object' && 'status' in err) {
    return err as Response
  }

  console.error('[tenant-middleware] Unexpected error:', err)
  return apiError('INTERNAL_ERROR', 'Внутрішня помилка сервера', 500)
}