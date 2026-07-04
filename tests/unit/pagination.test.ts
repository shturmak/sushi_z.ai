import { test, expect, describe } from 'bun:test';
import { parsePagination, paginateResult } from '@/lib/pagination';

describe('parsePagination', () => {
  test('uses defaults when no params provided', () => {
    const params = new URLSearchParams();
    const result = parsePagination(params);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
    expect(result.cursor).toBeUndefined();
  });

  test('parses custom page and limit', () => {
    const params = new URLSearchParams('page=3&limit=10');
    const result = parsePagination(params);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.cursor).toBeUndefined();
  });

  test('handles cursor parameter', () => {
    const params = new URLSearchParams('cursor=abc123&page=5');
    const result = parsePagination(params);
    expect(result.cursor).toBe('abc123');
    // When cursor is present, page is forced to 1
    expect(result.page).toBe(1);
  });

  test('clamps limit to maxLimit', () => {
    const params = new URLSearchParams('limit=500');
    const result = parsePagination(params, { limit: 25, maxLimit: 100 });
    expect(result.limit).toBe(100);
  });

  test('limit=0 falls back to default (0 is falsy in || chain)', () => {
    const params = new URLSearchParams('limit=0');
    const result = parsePagination(params);
    expect(result.limit).toBe(25); // parseInt('0') = 0, || defaults.limit kicks in
  });

  test('handles negative page by clamping to 1', () => {
    const params = new URLSearchParams('page=-5');
    const result = parsePagination(params);
    expect(result.page).toBe(1);
  });

  test('handles non-numeric page by defaulting to 1', () => {
    const params = new URLSearchParams('page=abc');
    const result = parsePagination(params);
    expect(result.page).toBe(1);
  });

  test('handles non-numeric limit by defaulting', () => {
    const params = new URLSearchParams('limit=xyz');
    const result = parsePagination(params);
    expect(result.limit).toBe(25);
  });

  test('uses custom defaults', () => {
    const params = new URLSearchParams();
    const result = parsePagination(params, { limit: 10, maxLimit: 50 });
    expect(result.limit).toBe(10);
  });

  test('respects maxLimit from custom defaults', () => {
    const params = new URLSearchParams('limit=200');
    const result = parsePagination(params, { limit: 10, maxLimit: 50 });
    expect(result.limit).toBe(50);
  });
});

describe('paginateResult', () => {
  test('calculates correct pagination for page 1 with more pages', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const result = paginateResult(items, 10, 1, 2);
    expect(result.data).toHaveLength(2);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(2);
    expect(result.pagination.total).toBe(10);
    expect(result.pagination.pages).toBe(5);
    expect(result.pagination.hasNext).toBe(true);
    expect(result.pagination.hasPrev).toBe(false);
  });

  test('calculates correct pagination for middle page', () => {
    const items = [{ id: '5' }, { id: '6' }];
    const result = paginateResult(items, 10, 3, 2);
    expect(result.pagination.page).toBe(3);
    expect(result.pagination.pages).toBe(5);
    expect(result.pagination.hasNext).toBe(true);
    expect(result.pagination.hasPrev).toBe(true);
  });

  test('calculates correct pagination for last page', () => {
    const items = [{ id: '9' }, { id: '10' }];
    const result = paginateResult(items, 10, 5, 2);
    expect(result.pagination.page).toBe(5);
    expect(result.pagination.pages).toBe(5);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(true);
  });

  test('single page when total equals limit', () => {
    const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const result = paginateResult(items, 3, 1, 3);
    expect(result.pagination.pages).toBe(1);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(false);
  });

  test('empty results still have correct pagination', () => {
    const result = paginateResult([], 0, 1, 10);
    expect(result.data).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.pages).toBe(0);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(false);
  });

  test('page beyond total returns correct hasPrev/hasNext', () => {
    const items: string[] = [];
    const result = paginateResult(items, 5, 10, 10);
    expect(result.pagination.pages).toBe(1); // ceil(5/10) = 1
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(true);
  });

  test('total not evenly divisible by limit rounds up pages', () => {
    const items = [{ id: '1' }];
    const result = paginateResult(items, 11, 1, 5);
    expect(result.pagination.pages).toBe(3); // ceil(11/5) = 3
  });

  test('preserves generic type of items', () => {
    interface Item { id: string; name: string; price: number; }
    const items: Item[] = [{ id: '1', name: 'Sushi', price: 100 }];
    const result = paginateResult(items, 1, 1, 10);
    expect(result.data[0].name).toBe('Sushi');
    expect(result.data[0].price).toBe(100);
  });
});