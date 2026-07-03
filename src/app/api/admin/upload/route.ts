import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('VALIDATION_ERROR', 'No file provided');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError('VALIDATION_ERROR', 'Only jpg, png, webp, gif images are allowed');
    }

    if (file.size > MAX_SIZE) {
      return apiError('VALIDATION_ERROR', 'File size must be under 5MB');
    }

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename with timestamp prefix
    const ext = file.name.split('.').pop() || 'webp';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${random}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(join(uploadsDir, filename), buffer);

    return apiSuccess({ url: `/uploads/${filename}` }, 'File uploaded', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Upload error:', error);
    return apiError('INTERNAL_ERROR', 'Upload failed', 500);
  }
}