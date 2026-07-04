import { NextRequest } from 'next/server';
import { readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

const LEGAL_DIR = join(process.cwd(), 'docs', 'legal');

const FILE_MAP: Record<string, string> = {
  privacy: 'privacy-policy.md',
  terms: 'terms-of-service.md',
  restaurant: 'restaurant-terms.md',
};

function getFilePath(type: string): string | null {
  const file = FILE_MAP[type];
  if (!file) return null;
  return join(LEGAL_DIR, file);
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const type = request.nextUrl.searchParams.get('type');
    if (!type || !FILE_MAP[type]) {
      return apiError('VALIDATION_ERROR', 'type must be one of: privacy, terms, restaurant', 400);
    }

    const filePath = getFilePath(type);
    if (!filePath) {
      return apiError('NOT_FOUND', 'Document not found', 404);
    }

    const [content, stats] = await Promise.all([
      readFile(filePath, 'utf-8'),
      stat(filePath),
    ]);

    return apiSuccess({
      type,
      content,
      lastUpdated: stats.mtime.toISOString(),
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed to read document', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const type = request.nextUrl.searchParams.get('type');
    if (!type || !FILE_MAP[type]) {
      return apiError('VALIDATION_ERROR', 'type must be one of: privacy, terms, restaurant', 400);
    }

    const filePath = getFilePath(type);
    if (!filePath) {
      return apiError('NOT_FOUND', 'Document not found', 404);
    }

    const body = await request.json();
    const { content } = body;

    if (typeof content !== 'string') {
      return apiError('VALIDATION_ERROR', 'content is required and must be a string', 400);
    }

    await writeFile(filePath, content, 'utf-8');
    const stats = await stat(filePath);

    return apiSuccess({
      type,
      content,
      lastUpdated: stats.mtime.toISOString(),
    }, 'Document saved');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed to save document', 500);
  }
}