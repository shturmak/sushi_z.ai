import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiNotFound } from '@/lib/api-response';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/brands/:id
 * Public: returns the full brand configuration by ID or slug.
 *
 * The `id` param can be either:
 *   - A CUID brand ID
 *   - A brand slug (e.g. "sushi-master")
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const { id } = await context.params;

  // Try to find by ID first, then by slug
  const brand =
    await db.brand.findUnique({ where: { id } }) ??
    await db.brand.findUnique({ where: { slug: id } });

  if (!brand) {
    return apiNotFound(`Brand "${id}" not found`);
  }

  return apiSuccess(brand);
}