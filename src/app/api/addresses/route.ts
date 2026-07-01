import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenantAuth, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest) {
  try {
    const ctx = await withTenantAuth(request);

    const addresses = await db.userAddress.findMany({
      where: { userId: ctx.user.userId, brandId: ctx.brandId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return apiSuccess(addresses);
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await withTenantAuth(request);
    const body = await request.json();
    const { label, street, building, apartment, floor, entrance, comment, latitude, longitude, isDefault } = body;

    if (!street) {
      return apiError('VALIDATION_ERROR', 'Street is required');
    }

    if (isDefault) {
      await db.userAddress.updateMany({
        where: { userId: ctx.user.userId, brandId: ctx.brandId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await db.userAddress.create({
      data: {
        userId: ctx.user.userId,
        brandId: ctx.brandId,
        label: label || null,
        street,
        building: building || null,
        apartment: apartment || null,
        floor: floor || null,
        entrance: entrance || null,
        comment: comment || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        isDefault: isDefault ?? false,
      },
    });

    return apiSuccess(address, 'Address created', 201);
  } catch (err) {
    return tenantCatch(err);
  }
}