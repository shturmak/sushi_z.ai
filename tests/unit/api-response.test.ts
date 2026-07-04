import { test, expect, describe } from 'bun:test';
// @ts-ignore - NextResponse needs Next.js runtime
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api-response';

async function parseJson(response: Response) {
  return response.json();
}

describe('apiSuccess', () => {
  test('returns correct JSON structure with data', async () => {
    const response = apiSuccess({ id: '1', name: 'Test' });
    const body = await parseJson(response);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: '1', name: 'Test' });
    expect(response.status).toBe(200);
  });

  test('includes message when provided', async () => {
    const response = apiSuccess({}, 'Operation successful');
    const body = await parseJson(response);
    expect(body.message).toBe('Operation successful');
  });

  test('omits message when not provided', async () => {
    const response = apiSuccess({});
    const body = await parseJson(response);
    expect(body.message).toBeUndefined();
  });

  test('uses custom status code', () => {
    const response = apiSuccess({}, undefined, 201);
    expect(response.status).toBe(201);
  });

  test('passes through custom headers', () => {
    const response = apiSuccess({}, undefined, 200, { 'X-Custom': 'value' });
    expect(response.headers.get('X-Custom')).toBe('value');
  });

  test('handles array data', async () => {
    const response = apiSuccess([1, 2, 3]);
    const body = await parseJson(response);
    expect(body.data).toEqual([1, 2, 3]);
  });

  test('handles null data', async () => {
    const response = apiSuccess(null);
    const body = await parseJson(response);
    expect(body.data).toBeNull();
  });
});

describe('apiError', () => {
  test('returns correct error structure', async () => {
    const response = apiError('VALIDATION_ERROR', 'Invalid input');
    const body = await parseJson(response);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Invalid input');
    expect(response.status).toBe(400);
  });

  test('includes details when provided', async () => {
    const details = { field: 'email', rule: 'required' };
    const response = apiError('VALIDATION_ERROR', 'Invalid', 400, details);
    const body = await parseJson(response);
    expect(body.error.details).toEqual({ field: 'email', rule: 'required' });
  });

  test('omits details when not provided', async () => {
    const response = apiError('BAD_REQUEST', 'Bad request');
    const body = await parseJson(response);
    expect(body.error.details).toBeUndefined();
  });

  test('uses custom status code', () => {
    const response = apiError('CONFLICT', 'Already exists', 409);
    expect(response.status).toBe(409);
  });

  test('passes through custom headers', () => {
    const response = apiError('RATE_LIMITED', 'Too many', 429, undefined, { 'Retry-After': '60' });
    expect(response.headers.get('Retry-After')).toBe('60');
  });
});

describe('apiUnauthorized', () => {
  test('returns 401 status', () => {
    const response = apiUnauthorized();
    expect(response.status).toBe(401);
  });

  test('has correct error code', async () => {
    const response = apiUnauthorized();
    const body = await parseJson(response);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('uses default message', async () => {
    const response = apiUnauthorized();
    const body = await parseJson(response);
    expect(body.error.message).toBe('Unauthorized');
  });

  test('uses custom message', async () => {
    const response = apiUnauthorized('Token expired');
    const body = await parseJson(response);
    expect(body.error.message).toBe('Token expired');
  });
});

describe('apiForbidden', () => {
  test('returns 403 status', () => {
    const response = apiForbidden();
    expect(response.status).toBe(403);
  });

  test('has correct error code', async () => {
    const response = apiForbidden();
    const body = await parseJson(response);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  test('uses default message', async () => {
    const response = apiForbidden();
    const body = await parseJson(response);
    expect(body.error.message).toBe('Forbidden');
  });

  test('uses custom message', async () => {
    const response = apiForbidden('Insufficient permissions');
    const body = await parseJson(response);
    expect(body.error.message).toBe('Insufficient permissions');
  });
});

describe('apiNotFound', () => {
  test('returns 404 status', () => {
    const response = apiNotFound();
    expect(response.status).toBe(404);
  });

  test('has correct error code', async () => {
    const response = apiNotFound();
    const body = await parseJson(response);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  test('uses default message', async () => {
    const response = apiNotFound();
    const body = await parseJson(response);
    expect(body.error.message).toBe('Not found');
  });

  test('uses custom message', async () => {
    const response = apiNotFound('Order not found');
    const body = await parseJson(response);
    expect(body.error.message).toBe('Order not found');
  });
});