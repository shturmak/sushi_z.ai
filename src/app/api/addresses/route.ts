import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET() {
  try {
    const authUser = await requireAuth();

    const addresses = await db.userAddress.findMany({
      where: { userId: authUser.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return apiSuccess(addresses);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('List addresses error:', error);
    return apiUnauthorized();
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { label, street, building, apartment, floor, entrance, comment, latitude, longitude, isDefault } = body;

    if (!street) {
      return apiError('VALIDATION_ERROR', 'Street is required');
    }

    if (isDefault) {
      await db.userAddress.updateMany({
        where: { userId: authUser.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await db.userAddress.create({
      data: {
        userId: authUser.userId,
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
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Create address error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to create address', 500);
  }
}