import { db } from '@/lib/db';
import { TenantError } from './tenant';

/**
 * Patterns that indicate a generic / non-branded host.
 * These should never be treated as brand slugs.
 */
const GENERIC_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^orderapp\.ua$/i,
  /^app\.orderapp\.ua$/i,
  /^www\.orderapp\.ua$/i,
];

/**
 * Convert a raw subdomain segment into a slug.
 * Rules: lowercase, replace underscores with hyphens.
 * The subdomain is expected to already be lowercase-ish from DNS,
 * but we normalise defensively.
 */
function normalizeToSlug(raw: string): string {
  return raw.toLowerCase().replace(/_/g, '-');
}

/**
 * Extract a brand slug from the request host.
 *
 * Examples:
 *   sushimaster.orderapp.ua → sushi-master
 *   sushimaster.ua           → sushi-master
 *   my-pizza.orderapp.ua     → my-pizza
 *
 * Returns null if the host looks generic (localhost, IP, bare domain, etc.)
 */
export function resolveBrandFromHost(host: string): string | null {
  // Guard: skip obvious generic hosts
  for (const pattern of GENERIC_HOST_PATTERNS) {
    if (pattern.test(host)) return null;
  }

  const parts = host.split('.').filter(Boolean);

  // We need at least a subdomain + one TLD component
  if (parts.length < 2) return null;

  // The first segment is the candidate subdomain/slug
  const candidate = normalizeToSlug(parts[0]);

  // Reject if it looks like a common non-brand prefix
  const NON_BRAND_PREFIXES = ['www', 'api', 'admin', 'm', 'app', 'staging', 'dev', 'test', 'preview'];
  if (NON_BRAND_PREFIXES.includes(candidate)) return null;

  return candidate;
}

/**
 * Extract a brand slug from the URL pathname.
 *
 * Only matches the first path segment: /sushi-master/menu → sushi-master
 * Rejects known Next.js / system routes.
 *
 * Returns null if no slug pattern is detected.
 */
export function resolveBrandFromPath(pathname: string): string | null {
  // Remove leading slash, split into segments
  const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const candidate = normalizeToSlug(segments[0]);

  // Reject known system / framework routes
  const SYSTEM_ROUTES = [
    'api', 'admin', '_next', 'favicon', 'robots', 'sitemap',
    'manifest', 'sw', 'workbox', 'auth', 'login', 'register',
    'me', 'cart', 'checkout', 'profile', 'orders', 'static',
    'images', 'fonts', 'assets', 'public',
  ];
  if (SYSTEM_ROUTES.includes(candidate)) return null;

  // Reject UUIDs / CUIDs (look like random IDs, not slugs)
  if (/^[a-z0-9]{20,}$/.test(candidate)) return null;

  return candidate;
}

/**
 * Resolve a brandId from the full Request by trying host first, then path.
 *
 * @throws TenantError('BRAND_NOT_FOUND', ..., 404) if no matching brand is found.
 */
export async function resolveBrandId(request: Request): Promise<string> {
  const url = new URL(request.url);

  // 1. Try host-based resolution
  const hostSlug = resolveBrandFromHost(url.hostname);
  if (hostSlug) {
    const brand = await db.brand.findUnique({ where: { slug: hostSlug } });
    if (brand) return brand.id;
  }

  // 2. Try path-based resolution
  const pathSlug = resolveBrandFromPath(url.pathname);
  if (pathSlug) {
    const brand = await db.brand.findUnique({ where: { slug: pathSlug } });
    if (brand) return brand.id;
  }

  throw new TenantError(
    'BRAND_NOT_FOUND',
    'Unable to resolve brand from request URL',
    404,
  );
}

/**
 * Look up a Brand record by its ID or slug.
 * Tries ID first (exact match), then slug (exact match).
 * Returns null if neither matches.
 */
export async function getBrandByIdOrSlug(
  identifier: string,
): Promise<Record<string, unknown> | null> {
  // Try ID first
  const byId = await db.brand.findUnique({ where: { id: identifier } });
  if (byId) return byId as unknown as Record<string, unknown>;

  // Then try slug
  const bySlug = await db.brand.findUnique({ where: { slug: identifier } });
  if (bySlug) return bySlug as unknown as Record<string, unknown>;

  return null;
}