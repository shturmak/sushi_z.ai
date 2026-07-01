import type {
  Brand, Branch, Category, Product, Order, Promotion, Analytics,
} from './admin-types';
import {
  mockBrands, mockBranches, mockCategories, mockProducts, mockOrders,
  mockPromotions, mockAnalytics,
} from './admin-mock-data';

type AnyRecord = Record<string, unknown>;

// In-memory mutable copies
const brands = [...mockBrands];
const branches = [...mockBranches];
const categories = [...mockCategories];
const products = [...mockProducts];
const orders = [...mockOrders];
const promotions = [...mockPromotions];

function extractId(path: string, prefix: string): string | null {
  const idx = path.indexOf(prefix);
  if (idx === -1) return null;
  const after = path.slice(idx + prefix.length);
  const id = after.split('/')[0]?.split('?')[0];
  return id || null;
}

export function getMockResponse<T>(path: string, options?: RequestInit): T {
  const method = options?.method?.toUpperCase() || 'GET';

  // ─── Brands ───
  if (path.startsWith('/api/admin/brands')) {
    if (path.includes('/brands/')) {
      const id = extractId(path, '/api/admin/brands/');
      if (id) {
        if (method === 'GET') {
          const b = brands.find(x => x.id === id);
          if (!b) throw new Error('Brand not found');
          return b as T;
        }
        if (method === 'PUT') {
          const body = JSON.parse(options?.body as string || '{}');
          const idx = brands.findIndex(x => x.id === id);
          if (idx === -1) throw new Error('Brand not found');
          brands[idx] = { ...brands[idx], ...body, updatedAt: new Date().toISOString() };
          return brands[idx] as T;
        }
        if (method === 'DELETE') {
          const idx = brands.findIndex(x => x.id === id);
          if (idx !== -1) brands.splice(idx, 1);
          return null as T;
        }
      }
    }
    if (method === 'GET') return brands as T;
    if (method === 'POST') {
      const body = JSON.parse(options?.body as string || '{}');
      const newItem: Brand = {
        id: 'brand' + Date.now(),
        name: body.name,
        slug: body.slug,
        logoUrl: null,
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        accentColor: body.accentColor,
        heroBannerUrl: null,
        promoBannerUrls: null,
        description: body.description || null,
        slogan: body.slogan || null,
        isActive: body.isActive,
        branchCount: 0,
        productCount: 0,
        orderCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      brands.push(newItem);
      return newItem as T;
    }
  }

  // ─── Analytics ───
  if (path.startsWith('/api/admin/analytics')) {
    return mockAnalytics as T;
  }

  // ─── Branches ───
  if (path.startsWith('/api/admin/branches') && !path.includes('/branches/') || path.endsWith('/api/admin/branches')) {
    if (path.includes('/branches/')) {
      const id = extractId(path, '/api/admin/branches/');
      if (id && method === 'GET') {
        const b = branches.find(x => x.id === id);
        if (!b) throw new Error('Branch not found');
        return b as T;
      }
      if (id && method === 'PUT') {
        const body = JSON.parse(options?.body as string || '{}');
        const idx = branches.findIndex(x => x.id === id);
        if (idx === -1) throw new Error('Branch not found');
        branches[idx] = { ...branches[idx], ...body, updatedAt: new Date().toISOString() };
        return branches[idx] as T;
      }
      if (id && method === 'DELETE') {
        const idx = branches.findIndex(x => x.id === id);
        if (idx !== -1) branches.splice(idx, 1);
        return null as T;
      }
    }
    if (method === 'GET') return branches as T;
    if (method === 'POST') {
      const body = JSON.parse(options?.body as string || '{}');
      const newItem: Branch = {
        id: 'br' + Date.now(),
        ...body,
        _count: { orders: 0, categories: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      branches.push(newItem);
      return newItem as T;
    }
  }

  // ─── Categories ───
  if (path.startsWith('/api/admin/menu/categories')) {
    if (path.includes('/categories/') && !path.includes('/categories') === false) {
      const id = extractId(path, '/api/admin/menu/categories/');
      if (id) {
        if (method === 'PUT') {
          const body = JSON.parse(options?.body as string || '{}');
          const idx = categories.findIndex(x => x.id === id);
          if (idx === -1) throw new Error('Category not found');
          categories[idx] = { ...categories[idx], ...body, updatedAt: new Date().toISOString() };
          return categories[idx] as T;
        }
        if (method === 'DELETE') {
          const idx = categories.findIndex(x => x.id === id);
          if (idx !== -1) categories.splice(idx, 1);
          return null as T;
        }
      }
    }
    if (method === 'GET') return categories as T;
    if (method === 'POST') {
      const body = JSON.parse(options?.body as string || '{}');
      const newItem: Category = {
        id: 'cat' + Date.now(),
        ...body,
        branch: null,
        _count: { products: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      categories.push(newItem);
      return newItem as T;
    }
  }

  // ─── Products ───
  if (path.startsWith('/api/admin/menu/products')) {
    if (path.includes('/products/')) {
      const id = extractId(path, '/api/admin/menu/products/');
      if (id) {
        if (method === 'GET') {
          const p = products.find(x => x.id === id);
          if (!p) throw new Error('Product not found');
          return p as T;
        }
        if (method === 'PUT') {
          const body = JSON.parse(options?.body as string || '{}');
          const idx = products.findIndex(x => x.id === id);
          if (idx === -1) throw new Error('Product not found');
          products[idx] = { ...products[idx], ...body, updatedAt: new Date().toISOString() };
          return products[idx] as T;
        }
        if (method === 'DELETE') {
          const idx = products.findIndex(x => x.id === id);
          if (idx !== -1) products.splice(idx, 1);
          return null as T;
        }
      }
    }
    if (method === 'GET') return products as T;
    if (method === 'POST') {
      const body = JSON.parse(options?.body as string || '{}');
      const cat = categories.find(c => c.id === body.categoryId);
      const newItem: Product = {
        id: 'p' + Date.now(),
        ...body,
        category: { name: cat?.name || '' },
        branch: null,
        optionGroups: body.optionGroups || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      products.push(newItem);
      return newItem as T;
    }
  }

  // ─── Orders ───
  if (path.startsWith('/api/admin/orders')) {
    if (path.includes('/status')) {
      const id = extractId(path, '/api/admin/orders/');
      const cleanId = id?.replace('/status', '');
      if (cleanId && method === 'PUT') {
        const body = JSON.parse(options?.body as string || '{}');
        const order = orders.find(o => o.id === cleanId);
        if (order) {
          order.status = body.status;
          order.updatedAt = new Date().toISOString();
        }
        return null as T;
      }
    }
    if (method === 'GET') {
      const url = new URL(path, 'http://localhost');
      const status = url.searchParams.get('status');
      const branchId = url.searchParams.get('branchId');
      let filtered = [...orders];
      if (status) filtered = filtered.filter(o => o.status === status);
      if (branchId) filtered = filtered.filter(o => o.branchId === branchId);
      return {
        orders: filtered,
        total: filtered.length,
        page: 1,
        limit: 25,
        pages: 1,
      } as T;
    }
  }

  // ─── Promotions ───
  if (path.startsWith('/api/admin/promotions')) {
    if (path.includes('/promotions/')) {
      const id = extractId(path, '/api/admin/promotions/');
      if (id) {
        if (method === 'PUT') {
          const body = JSON.parse(options?.body as string || '{}');
          const idx = promotions.findIndex(x => x.id === id);
          if (idx === -1) throw new Error('Promotion not found');
          promotions[idx] = { ...promotions[idx], ...body, updatedAt: new Date().toISOString() };
          return promotions[idx] as T;
        }
        if (method === 'DELETE') {
          const idx = promotions.findIndex(x => x.id === id);
          if (idx !== -1) promotions.splice(idx, 1);
          return null as T;
        }
      }
    }
    if (method === 'GET') return promotions as T;
    if (method === 'POST') {
      const body = JSON.parse(options?.body as string || '{}');
      const newItem: Promotion = {
        id: 'pr' + Date.now(),
        ...body,
        usedCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      promotions.push(newItem);
      return newItem as T;
    }
  }

  throw new Error(`Unknown API path: ${path}`);
}