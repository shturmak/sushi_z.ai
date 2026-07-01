import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { withTenantAuth, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await withTenantAuth(request);
    const { id } = await params;

    const address = await db.userAddress.findFirst({
      where: { id, userId: ctx.user.userId, brandId: ctx.brandId },
    });

    if (!address) {
      return apiNotFound('Address not found');
    }

    return apiSuccess(address);
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await withTenantAuth(request);
    const { id } = await params;
    const body = await request.json();
    const { label, street, building, apartment, floor, entrance, comment, latitude, longitude, isDefault } = body;

    const address = await db.userAddress.findFirst({
      where: { id, userId: ctx.user.userId, brandId: ctx.brandId },
    });

    if (!address) {
      return apiNotFound('Address not found');
    }

    if (isDefault && !address.isDefault) {
      await db.userAddress.updateMany({
        where: { userId: ctx.user.userId, brandId: ctx.brandId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await db.userAddress.update({
      where: { id },
      data: {
        ...(label !== undefined && { label: label || null }),
        ...(street !== undefined && { street }),
        ...(building !== undefined && { building: building || null }),
        ...(apartment !== undefined && { apartment: apartment || null }),
        ...(floor !== undefined && { floor: floor || null }),
        ...(entrance !== undefined && { entrance: entrance || null }),
        ...(comment !== undefined && { comment: comment || null }),
        ...(latitude !== undefined && { latitude: latitude ?? null }),
        ...(longitude !== undefined && { longitude: longitude ?? null }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return apiSuccess(updated, 'Address updated');
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await withTenantAuth(request);
    const { id } = await params;

    const address = await db.userAddress.findFirst({
      where: { id, userId: ctx.user.userId, brandId: ctx.brandId },
    });

    if (!address) {
      return apiNotFound('Address not found');
    }

    await db.userAddress.delete({ where: { id } });

    return apiSuccess(null, 'Address deleted');
  } catch (err) {
    return tenantCatch(err);
  }
}