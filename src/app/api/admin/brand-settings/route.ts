import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { getBrandSettings, updateBrandSettings } from '@/lib/feature-flags';
import type { BrandSettingsData } from '@/lib/feature-flags';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const brandId = request.nextUrl.searchParams.get('brandId');

    if (!brandId) {
      return apiError('VALIDATION_ERROR', 'brandId is required', 400);
    }

    const settings = await getBrandSettings(brandId);

    // Also fetch brand info for the General tab
    const { db } = await import('@/lib/db');
    const brand = await db.brand.findUnique({
      where: { id: brandId },
      select: {
        name: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        currency: true,
        currencySymbol: true,
      },
    });

    return apiSuccess({
      ...settings,
      brand,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const brandId = request.nextUrl.searchParams.get('brandId');

    if (!brandId) {
      return apiError('VALIDATION_ERROR', 'brandId is required', 400);
    }

    const body = await request.json();

    // Separate brand-level fields from settings fields
    const { brand: brandFields, ...settingsData } = body;

    // Update brand settings (feature flags)
    const settings = await updateBrandSettings(
      brandId,
      settingsData as Partial<BrandSettingsData>,
    );

    // Update brand-level fields if provided
    if (brandFields && typeof brandFields === 'object') {
      const { db } = await import('@/lib/db');
      const brandUpdate: Record<string, unknown> = {};
      if (typeof brandFields.primaryColor === 'string') brandUpdate.primaryColor = brandFields.primaryColor;
      if (typeof brandFields.secondaryColor === 'string') brandUpdate.secondaryColor = brandFields.secondaryColor;
      if (typeof brandFields.accentColor === 'string') brandUpdate.accentColor = brandFields.accentColor;
      if (typeof brandFields.currency === 'string') brandUpdate.currency = brandFields.currency;
      if (typeof brandFields.currencySymbol === 'string') brandUpdate.currencySymbol = brandFields.currencySymbol;

      if (Object.keys(brandUpdate).length > 0) {
        await db.brand.update({
          where: { id: brandId },
          data: brandUpdate,
        });
      }
    }

    return apiSuccess(settings, 'Settings saved');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Update brand settings error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}