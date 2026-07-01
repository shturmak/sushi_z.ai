import { headers } from 'next/headers';
import { verifyAccessToken, TokenPayload } from './auth';
import { apiUnauthorized } from './api-response';

export async function getAuthUser(): Promise<TokenPayload | null> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

export async function requireAuth(): Promise<TokenPayload> {
  const user = await getAuthUser();
  if (!user) throw await apiUnauthorized();
  return user;
}

export async function requireAdmin(): Promise<TokenPayload> {
  const user = await requireAuth();
  if (user.role !== 'admin' && user.role !== 'manager') {
    throw await apiForbidden('Admin access required');
  }
  return user;
}