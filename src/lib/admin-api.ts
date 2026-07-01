'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { ApiSuccessResponse, ApiErrorResponse } from './admin-types';

type ApiResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

// Use mock data in demo mode; set to false to call real API
const USE_MOCK = true;

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  if (USE_MOCK) {
    // Small delay to simulate network
    await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
    const { getMockResponse } = await import('./admin-mock-resolver');
    return getMockResponse<T>(path, options);
  }

  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = await res.json();

  if (!res.ok || !json.success) {
    const err = json as ApiErrorResponse;
    throw new Error(err.error?.message || `Request failed (${res.status})`);
  }

  return (json as ApiSuccessResponse<T>).data;
}

export function useAdminApi<T>(path: string, defaultValue: T): ApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchApi<T>(path);
      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [path]);

  // Auto-fetch on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data: data ?? defaultValue, loading, error, refetch };
}

export async function adminPost<TReq, TRes = unknown>(path: string, body: TReq): Promise<TRes> {
  const result = await fetchApi<TRes>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  toast.success('Успішно збережено');
  return result;
}

export async function adminPut<TReq, TRes = unknown>(path: string, body: TReq): Promise<TRes> {
  const result = await fetchApi<TRes>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  toast.success('Успішно оновлено');
  return result;
}

export async function adminDelete<TRes = unknown>(path: string): Promise<TRes> {
  const result = await fetchApi<TRes>(path, { method: 'DELETE' });
  toast.success('Успішно видалено');
  return result;
}