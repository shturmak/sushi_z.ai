import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET() {
  try {
    const authUser = await requireAuth();
    const user = await db.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, phone: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, createdAt: true },
    });
    if (!user) return apiError('NOT_FOUND', 'User not found', 404);
    return apiSuccess(user);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Get profile error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch profile', 500);
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { firstName, lastName, email } = body;

    const updateData: Record<string, string> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) {
      const existing = await db.user.findUnique({ where: { email } });
      if (existing && existing.id !== authUser.userId) return apiError('CONFLICT', 'Email already taken', 409);
      updateData.email = email;
    }

    const user = await db.user.update({
      where: { id: authUser.userId },
      data: updateData,
      select: { id: true, phone: true, email: true, firstName: true, lastName: true, role: true },
    });
    return apiSuccess(user, 'Profile updated');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Update profile error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to update profile', 500);
  }
}