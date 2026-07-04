import { create } from 'zustand';

interface User {
  id: string;
  phone?: string;
  email?: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface BrandInfo {
  id: string;
  name: string;
  slug: string;
  slogan?: string | null;
  description?: string | null;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
}

// ── Brand store (storefront) ──────────────────────────────

interface BrandState {
  brand: BrandInfo | null;
  setBrand: (brand: BrandInfo) => void;
  clearBrand: () => void;
}

export const useBrand = create<BrandState>((set) => ({
  brand: null,
  setBrand: (brand) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sc_brand', brand.slug);
    }
    set({ brand });
  },
  clearBrand: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sc_brand');
    }
    set({ brand: null });
  },
}));

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (data: { user: User; accessToken: string; refreshToken: string }) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  login: (data) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sc_token', data.accessToken);
      localStorage.setItem('sc_refresh', data.refreshToken);
    }
    set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, isAuthenticated: true });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sc_token');
      localStorage.removeItem('sc_refresh');
    }
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
  setToken: (token) => set({ accessToken: token }),
}));

// API helper with auth
export async function apiFetch<T = any>(url: string, options: RequestInit = {}): Promise<{ data: T | null; error: string | null }> {
  let token = useAuth.getState().accessToken;
  if (typeof window !== 'undefined' && !token) {
    token = localStorage.getItem('sc_token');
    if (token) useAuth.getState().setToken(token);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(url, { ...options, headers });
    const json = await res.json();

    if (json.success) return { data: json.data, error: null };
    return { data: null, error: json.error?.message || 'Unknown error' };
  } catch (e: any) {
    return { data: null, error: e.message || 'Network error' };
  }
}

export const API = {
  auth: {
    login: (email: string, password: string) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (data: any) => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    logout: (refreshToken: string) => apiFetch('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
    profile: () => apiFetch('/api/me'),
  },
  branches: {
    list: () => apiFetch('/api/branches'),
    get: (id: string) => apiFetch(`/api/branches/${id}`),
    zones: (id: string) => apiFetch(`/api/branches/${id}/delivery-zones`),
  },
  menu: {
    byBranch: (branchId: string) => apiFetch(`/api/menu?branchId=${branchId}`),
    search: (params: { branchId: string; search?: string; tags?: string; excludeAllergens?: string; vegetarian?: string; minPrice?: number; maxPrice?: number }) => {
      const sp = new URLSearchParams({ branchId: params.branchId });
      if (params.search) sp.set('search', params.search);
      if (params.tags) sp.set('tags', params.tags);
      if (params.excludeAllergens) sp.set('excludeAllergens', params.excludeAllergens);
      if (params.vegetarian) sp.set('vegetarian', params.vegetarian);
      if (params.minPrice) sp.set('minPrice', String(params.minPrice));
      if (params.maxPrice) sp.set('maxPrice', String(params.maxPrice));
      return apiFetch(`/api/products/search?${sp.toString()}`);
    },
    product: (id: string) => apiFetch(`/api/products/${id}`),
  },
  cart: {
    get: () => apiFetch('/api/cart'),
    getOrCreate: () => apiFetch('/api/cart'),
    create: (branchId: string) => apiFetch('/api/cart', { method: 'POST', body: JSON.stringify({ branchId }) }),
    addItem: (data: any) => apiFetch('/api/cart/items', { method: 'POST', body: JSON.stringify(data) }),
    updateItem: (id: string, quantity: number) => apiFetch(`/api/cart/items/${id}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
    removeItem: (id: string) => apiFetch(`/api/cart/items/${id}`, { method: 'DELETE' }),
    clear: () => apiFetch('/api/cart', { method: 'DELETE' }),
  },
  orders: {
    list: (status?: string) => apiFetch(`/api/orders${status ? `?status=${status}` : ''}`),
    get: (id: string) => apiFetch(`/api/orders/${id}`),
    create: (data: any) => apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
    guest: (data: any) => apiFetch('/api/orders/guest', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: string) => apiFetch(`/api/orders/${id}/cancel`, { method: 'POST' }),
    repeat: (id: string) => apiFetch(`/api/orders/${id}/repeat`, { method: 'POST' }),
  },
  promotions: {
    list: () => apiFetch('/api/promotions'),
    validate: (code: string, subtotal: number) => apiFetch('/api/promotions/validate', { method: 'POST', body: JSON.stringify({ code, subtotal }) }),
  },
  loyalty: {
    get: () => apiFetch('/api/me/loyalty'),
    transactions: () => apiFetch('/api/loyalty/transactions'),
  },
  addresses: {
    list: () => apiFetch('/api/me/addresses'),
    create: (data: any) => apiFetch('/api/me/addresses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch(`/api/me/addresses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/api/me/addresses/${id}`, { method: 'DELETE' }),
  },
  favorites: {
    list: () => apiFetch('/api/favorites'),
    add: (productId: string) => apiFetch('/api/favorites', { method: 'POST', body: JSON.stringify({ productId }) }),
    remove: (productId: string) => apiFetch('/api/favorites', { method: 'DELETE', body: JSON.stringify({ productId }) }),
  },
  recommendations: {
    list: (branchId: string) => apiFetch('/api/recommendations?branchId=' + branchId),
  },
  brands: {
    list: () => apiFetch('/api/brands'),
  },
  reviews: {
    getByProduct: (productId: string) => apiFetch(`/api/products/${productId}/reviews`),
    create: (productId: string, data: { orderId: string; rating: number; comment?: string }) =>
      apiFetch(`/api/products/${productId}/reviews`, { method: 'POST', body: JSON.stringify(data) }),
  },
  feedback: {
    submit: (data: { type: string; subject?: string; message: string; contactInfo?: string; orderId?: string; branchId?: string }) =>
      apiFetch('/api/feedback', { method: 'POST', body: JSON.stringify(data) }),
  },
  admin: {
    analytics: () => apiFetch('/api/admin/analytics'),
    branches: () => apiFetch('/api/admin/branches'),
    orders: (params?: string) => apiFetch(`/api/admin/orders${params ? `?${params}` : ''}`),
    updateOrderStatus: (id: string, status: string) => apiFetch(`/api/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    categories: () => apiFetch('/api/admin/menu/categories'),
    products: () => apiFetch('/api/admin/menu/products'),
    promotions: () => apiFetch('/api/admin/promotions'),
    createBranch: (data: any) => apiFetch('/api/admin/branches', { method: 'POST', body: JSON.stringify(data) }),
    createCategory: (data: any) => apiFetch('/api/admin/menu/categories', { method: 'POST', body: JSON.stringify(data) }),
    createProduct: (data: any) => apiFetch('/api/admin/menu/products', { method: 'POST', body: JSON.stringify(data) }),
    createPromotion: (data: any) => apiFetch('/api/admin/promotions', { method: 'POST', body: JSON.stringify(data) }),
  },
};