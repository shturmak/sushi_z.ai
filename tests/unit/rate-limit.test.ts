import { test, expect, describe, beforeEach } from 'bun:test';
import { rateLimit, authLimiter, apiLimiter, publicLimiter, rateLimitHeaders } from '@/lib/rate-limit';

describe('rateLimit', () => {
  test('allows first request under the limit', () => {
    const result = rateLimit('test-allow-1', { intervalMs: 60_000, maxRequests: 5 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  test('allows requests up to the max', () => {
    const key = 'test-up-to-max';
    for (let i = 0; i < 5; i++) {
      const result = rateLimit(key, { intervalMs: 60_000, maxRequests: 5 });
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  test('blocks requests when limit exceeded', () => {
    const key = 'test-blocked';
    for (let i = 0; i < 5; i++) rateLimit(key, { intervalMs: 60_000, maxRequests: 5 });
    const result = rateLimit(key, { intervalMs: 60_000, maxRequests: 5 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test('returns correct remaining count', () => {
    const key = 'test-remaining';
    const r1 = rateLimit(key, { intervalMs: 60_000, maxRequests: 10 });
    expect(r1.remaining).toBe(9);
    const r2 = rateLimit(key, { intervalMs: 60_000, maxRequests: 10 });
    expect(r2.remaining).toBe(8);
    const r3 = rateLimit(key, { intervalMs: 60_000, maxRequests: 10 });
    expect(r3.remaining).toBe(7);
  });

  test('resets after interval (simulated by future resetAt)', () => {
    // We can't easily wait, but we can verify the resetAt value is correct
    const before = Date.now();
    const result = rateLimit('test-reset-ts', { intervalMs: 60_000, maxRequests: 5 });
    expect(result.resetAt).toBeGreaterThanOrEqual(before + 60_000 - 10); // small tolerance
    expect(result.resetAt).toBeLessThanOrEqual(before + 60_000 + 10);
  });

  test('different keys have independent counters', () => {
    const keyA = 'test-independent-a';
    const keyB = 'test-independent-b';
    for (let i = 0; i < 3; i++) rateLimit(keyA, { intervalMs: 60_000, maxRequests: 3 });
    const rA = rateLimit(keyA, { intervalMs: 60_000, maxRequests: 3 });
    const rB = rateLimit(keyB, { intervalMs: 60_000, maxRequests: 3 });
    expect(rA.success).toBe(false);
    expect(rB.success).toBe(true);
  });

  test('maxRequests of 1 allows exactly one request', () => {
    const key = 'test-max-1';
    const r1 = rateLimit(key, { intervalMs: 60_000, maxRequests: 1 });
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(0);
    const r2 = rateLimit(key, { intervalMs: 60_000, maxRequests: 1 });
    expect(r2.success).toBe(false);
  });
});

describe('rate limit presets', () => {
  test('authLimiter uses 10 max requests', () => {
    // Unique key per test to avoid cross-contamination
    const key = 'preset-auth';
    const r1 = authLimiter(key);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(9);
  });

  test('apiLimiter uses 120 max requests', () => {
    const key = 'preset-api';
    const r1 = apiLimiter(key);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(119);
  });

  test('publicLimiter uses 60 max requests', () => {
    const key = 'preset-public';
    const r1 = publicLimiter(key);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(59);
  });
});

describe('rateLimitHeaders', () => {
  test('generates correct headers for successful request', () => {
    const result = { success: true, remaining: 8, resetAt: Date.now() + 60_000 };
    const headers = rateLimitHeaders(result) as Record<string, string>;
    expect(headers['X-RateLimit-Remaining']).toBe('8');
    expect(headers['X-RateLimit-Reset']).toBeDefined();
    expect(headers['Retry-After']).toBeUndefined();
  });

  test('generates Retry-After header when blocked', () => {
    const futureReset = Date.now() + 30_000;
    const result = { success: false, remaining: 0, resetAt: futureReset };
    const headers = rateLimitHeaders(result) as Record<string, string>;
    expect(headers['X-RateLimit-Remaining']).toBe('0');
    expect(headers['X-RateLimit-Reset']).toBeDefined();
    expect(headers['Retry-After']).toBeDefined();
    // Retry-After should be roughly 30 seconds
    const retryAfter = parseInt(headers['Retry-After'], 10);
    expect(retryAfter).toBeGreaterThanOrEqual(29);
    expect(retryAfter).toBeLessThanOrEqual(31);
  });

  test('X-RateLimit-Reset is in seconds (not ms)', () => {
    const now = Date.now();
    const result = { success: true, remaining: 5, resetAt: now + 60_000 };
    const headers = rateLimitHeaders(result) as Record<string, string>;
    const resetSeconds = parseInt(headers['X-RateLimit-Reset'], 10);
    // resetAt is in ms, header should be in seconds
    expect(resetSeconds).toBe(Math.ceil((now + 60_000) / 1000));
  });

  test('Retry-After is 0 or positive when reset is imminent', () => {
    // resetAt slightly in the future
    const result = { success: false, remaining: 0, resetAt: Date.now() + 500 };
    const headers = rateLimitHeaders(result) as Record<string, string>;
    const retryAfter = parseInt(headers['Retry-After'], 10);
    expect(retryAfter).toBeGreaterThanOrEqual(0);
  });

  test('Retry-After is 1 when reset is exactly 1s away', () => {
    const result = { success: false, remaining: 0, resetAt: Date.now() + 1000 };
    const headers = rateLimitHeaders(result) as Record<string, string>;
    const retryAfter = parseInt(headers['Retry-After'], 10);
    expect(retryAfter).toBe(1);
  });
});