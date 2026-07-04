import { test, expect, describe } from 'bun:test';
import { cn } from '@/lib/utils';

describe('cn', () => {
  test('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  test('handles empty inputs', () => {
    expect(cn()).toBe('');
  });

  test('handles single class name', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  test('filters out falsy values', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  test('merges conflicting tailwind classes (later wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  test('merges conflicting text color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  test('handles conditional classes', () => {
    const active = true;
    const disabled = false;
    expect(cn('base', active && 'active', disabled && 'disabled')).toBe('base active');
  });

  test('handles undefined and null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b');
  });

  test('handles array inputs', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });

  test('handles mixed types', () => {
    expect(cn('text-sm', { 'font-bold': true, 'italic': false }, 'mt-2')).toBe('text-sm font-bold mt-2');
  });

  test('deduplicates identical classes', () => {
    expect(cn('flex', 'flex')).toBe('flex');
  });

  test('handles complex tailwind merge scenarios', () => {
    // padding merge: later overrides earlier
    expect(cn('p-2', 'p-4')).toBe('p-4');
    // margin merge
    expect(cn('m-1', 'm-2')).toBe('m-2');
    // different axis padding should coexist
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });
});