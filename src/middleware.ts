import { NextRequest, NextResponse } from 'next/server'

// ── Configuration ────────────────────────────────────────────────────

const BRAND_DOMAIN = process.env.BRAND_DOMAIN || 'sushichain.ua'

// Subdomains that are reserved and should NOT be treated as brand slugs
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin'])

// Regex to match /b/<slug>/... path pattern
const PATH_PREFIX_RE = /^\/b\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(.*)$/i

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Extract brand slug from subdomain.
 * e.g. "sushi-master.sushichain.ua" → "sushi-master"
 * Returns undefined for bare domain or reserved subdomains.
 */
function slugFromSubdomain(hostname: string): string | undefined {
  // Remove port if present (e.g. "localhost:3000")
  const host = hostname.split(':')[0]

  // Check if hostname ends with the brand domain
  const domainParts = BRAND_DOMAIN.split('.')
  const hostParts = host.split('.')

  // Host must have more parts than the base domain to have a subdomain
  if (hostParts.length <= domainParts.length) {
    return undefined
  }

  // Verify the domain suffix matches
  const suffix = hostParts.slice(-domainParts.length).join('.')
  if (suffix !== BRAND_DOMAIN) {
    return undefined
  }

  // Everything before the domain is the subdomain chain (e.g. "sushi-master" or "a.b")
  // We only use the first (leftmost) part
  const subdomain = hostParts[0]

  if (RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
    return undefined
  }

  return subdomain.toLowerCase()
}

/**
 * Extract brand slug from /b/<slug>/... path prefix.
 * Returns { slug, rewrittenPath } or undefined if no match.
 */
function slugFromPath(pathname: string): { slug: string; rewrittenPath: string } | undefined {
  const match = pathname.match(PATH_PREFIX_RE)
  if (!match) {
    return undefined
  }

  const slug = match[1].toLowerCase()
  const remaining = match[2] // could be empty string for /b/slug/
  // Rewrite to either "/" or "/<remaining>"
  const rewrittenPath = remaining ? `/${remaining}` : '/'
  return { slug, rewrittenPath }
}

/**
 * Extract brand slug from ?brand=<slug> query parameter.
 */
function slugFromQuery(request: NextRequest): string | undefined {
  const brand = request.nextUrl.searchParams.get('brand')
  if (!brand) {
    return undefined
  }

  // Basic slug validation: alphanumeric + hyphens
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(brand)) {
    return brand.toLowerCase()
  }

  return undefined
}

// ── Middleware ────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Extract brand slug in priority order ────────────────────────

  // Priority 1: Path prefix /b/<slug>/
  const pathMatch = slugFromPath(pathname)
  let brandSlug: string | undefined = pathMatch?.slug
  let shouldRewrite = !!pathMatch
  let rewrittenPath = pathMatch?.rewrittenPath

  // Priority 2: Subdomain (only if path didn't match)
  if (!brandSlug) {
    brandSlug = slugFromSubdomain(request.headers.get('host') || '')
  }

  // Priority 3: Query param ?brand=<slug> (fallback for development)
  if (!brandSlug) {
    brandSlug = slugFromQuery(request)
  }

  // ── 2. No brand found → let request pass through unchanged ─────────

  if (!brandSlug) {
    return NextResponse.next()
  }

  // ── 3. Brand found → set header and optionally rewrite ─────────────

  const response = shouldRewrite && rewrittenPath !== undefined
    ? NextResponse.rewrite(new URL(rewrittenPath, request.url))
    : NextResponse.next()

  response.headers.set('x-brand-slug', brandSlug)

  return response
}

// ── Matcher configuration ────────────────────────────────────────────
// Skip internal routes that don't need brand resolution.
// All other routes pass through the middleware.

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *  - /_next/* (static assets, images, etc.)
     *  - /favicon.ico, /robots.txt, /sitemap.xml (static files)
     *  - /images/*, /icons/*, /assets/* (public static dirs)
     *  - /api/* (API routes resolve brand via tenant-middleware)
     *  - /admin/* (admin panel has its own auth)
     *  - /*.* (files with extensions — static assets)
     */
    '/((?!_next|api|admin|favicon\\.ico|robots\\.txt|sitemap\\.xml|images/|icons/|assets/).*)',
  ],
}