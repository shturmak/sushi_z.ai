import { NextResponse } from 'next/server';

export type ApiSuccessResponse<T = unknown> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function apiSuccess<T>(data: T, message?: string, status = 200, headers?: HeadersInit) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    { success: true, data, ...(message ? { message } : {}) },
    { status, headers }
  );
}

export function apiError(code: string, message: string, status = 400, details?: unknown, headers?: HeadersInit) {
  return NextResponse.json<ApiErrorResponse>(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status, headers }
  );
}

export function apiUnauthorized(message = 'Unauthorized') {
  return apiError('UNAUTHORIZED', message, 401);
}

export function apiForbidden(message = 'Forbidden') {
  return apiError('FORBIDDEN', message, 403);
}

export function apiNotFound(message = 'Not found') {
  return apiError('NOT_FOUND', message, 404);
}