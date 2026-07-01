import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenantAdmin, tenantCatch } from '@/lib/tenant-middleware';
import { getAdminAnalytics } from '@/domain/analytics.service';
import type { TenantContext } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const ctx: TenantContext = await withTenantAdmin(request);
    const analytics = await getAdminAnalytics(ctx);
    return apiSuccess(analytics);
  } catch (err) {
    return tenantCatch(err);
  }
}