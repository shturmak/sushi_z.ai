import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound, apiUnauthorized } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { label, street, building, apartment, floor, entrance, comment, latitude, longitude, isDefault } = body;

    const address = await db.userAddress.findFirst({
      where: { id, userId: authUser.userId },
    });

    if (!address) {
      return apiNotFound('Address not found');
    }

    if (isDefault && !address.isDefault) {
      await db.userAddress.updateMany({
        where: { userId: authUser.userId, isDefault: true },
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
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Update address error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to update address', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id } = await params;

    const address = await db.userAddress.findFirst({
      where: { id, userId: authUser.userId },
    });

    if (!address) {
      return apiNotFound('Address not found');
    }

    await db.userAddress.delete({ where: { id } });

    return apiSuccess(null, 'Address deleted');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Delete address error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to delete address', 500);
  }
}