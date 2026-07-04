'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useAdminAuth } from './admin-auth';
import { useBrandStore } from './brand-store';
import type { ApiSuccessResponse, ApiErrorResponse } from './admin-types';

type ApiResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

// ── Build authenticated fetch options ──────────────────────────────

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  const token = useAdminAuth.getState().token;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function buildUrl(path: string): string {
  const url = new URL(path, 'http://localhost');
  const brand = useBrandStore.getState().currentBrandId;
  // Append brandId for tenant-scoped endpoints (but not for brand listing itself)
  if (brand && !path.includes('/admin/brands')) {
    url.searchParams.set('brandId', brand);
  }
  return url.pathname + url.search;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const finalUrl = buildUrl(path);
  const headers = buildHeaders((options?.headers as Record<string, string>) || undefined);

  const res = await fetch(finalUrl, {
    ...options,
    headers,
  });
  const json = await res.json();

  if (!res.ok || !json.success) {
    const err = json as ApiErrorResponse;
    throw new Error(err.error?.message || `Request failed (${res.status})`);
  }

  return (json as ApiSuccessResponse<T>).data;
}

// ── Hook ───────────────────────────────────────────────────────────

export function useAdminApi<T>(path: string, defaultValue: T): ApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = useAdminAuth((s) => s.isAuthenticated);
  const initDone = useAdminAuth((s) => !s.loading);
  const brandId = useBrandStore((s) => s.currentBrandId);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchApi<T>(path);
      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      // Don't spam toast on every auth error during init
      if (isAuthenticated) {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [path, isAuthenticated]);

  // Auto-fetch when auth is ready AND (brand is selected OR this is the brands endpoint)
  useEffect(() => {
    if (!initDone) return;
    // Brands endpoint doesn't need brandId
    if (path.includes('/admin/brands') && isAuthenticated) {
      refetch();
      return;
    }
    // All other endpoints need a selected brand
    if (brandId && isAuthenticated) {
      refetch();
    }
  }, [refetch, initDone, isAuthenticated, brandId, path]);

  return { data: data ?? defaultValue, loading, error, refetch };
}

// ── Paginated hook (auto-unwraps { data, pagination } envelope) ────────

type PaginatedApiResult<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number; hasNext: boolean; hasPrev: boolean };
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useAdminPaginatedApi<T>(path: string): PaginatedApiResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginatedApiResult<T>['pagination']>({ page: 1, limit: 50, total: 0, pages: 0, hasNext: false, hasPrev: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = useAdminAuth((s) => s.isAuthenticated);
  const initDone = useAdminAuth((s) => !s.loading);
  const brandId = useBrandStore((s) => s.currentBrandId);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchApi<{ data: T[]; pagination: PaginatedApiResult<T>['pagination'] }>(path);
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      if (isAuthenticated) toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [path, isAuthenticated]);

  useEffect(() => {
    if (!initDone) return;
    if (path.includes('/admin/brands') && isAuthenticated) { refetch(); return; }
    if (brandId && isAuthenticated) { refetch(); }
  }, [refetch, initDone, isAuthenticated, brandId, path]);

  return { data, pagination, loading, error, refetch };
}

// ── Mutation helpers ───────────────────────────────────────────────

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

export async function adminPatch<TReq, TRes = unknown>(path: string, body: TReq): Promise<TRes> {
  const result = await fetchApi<TRes>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return result;
}

export async function adminDelete<TRes = unknown>(path: string): Promise<TRes> {
  const result = await fetchApi<TRes>(path, { method: 'DELETE' });
  toast.success('Успішно видалено');
  return result;
}