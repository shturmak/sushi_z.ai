import { test, expect, describe } from 'bun:test';
import { isValidTransition } from '@/domain/order.service';

describe('isValidTransition', () => {
  describe('valid transitions', () => {
    test('new → confirmed', () => {
      expect(isValidTransition('new', 'confirmed')).toBe(true);
    });

    test('new → cancelled', () => {
      expect(isValidTransition('new', 'cancelled')).toBe(true);
    });

    test('confirmed → cooking', () => {
      expect(isValidTransition('confirmed', 'cooking')).toBe(true);
    });

    test('confirmed → cancelled', () => {
      expect(isValidTransition('confirmed', 'cancelled')).toBe(true);
    });

    test('cooking → ready', () => {
      expect(isValidTransition('cooking', 'ready')).toBe(true);
    });

    test('cooking → cancelled', () => {
      expect(isValidTransition('cooking', 'cancelled')).toBe(true);
    });

    test('ready → delivering', () => {
      expect(isValidTransition('ready', 'delivering')).toBe(true);
    });

    test('delivering → completed', () => {
      expect(isValidTransition('delivering', 'completed')).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    test('new → cooking (skip confirmed)', () => {
      expect(isValidTransition('new', 'cooking')).toBe(false);
    });

    test('new → ready', () => {
      expect(isValidTransition('new', 'ready')).toBe(false);
    });

    test('new → delivering', () => {
      expect(isValidTransition('new', 'delivering')).toBe(false);
    });

    test('new → completed', () => {
      expect(isValidTransition('new', 'completed')).toBe(false);
    });

    test('confirmed → completed (skip cooking, ready, delivering)', () => {
      expect(isValidTransition('confirmed', 'completed')).toBe(false);
    });

    test('confirmed → ready (skip cooking)', () => {
      expect(isValidTransition('confirmed', 'ready')).toBe(false);
    });

    test('confirmed → delivering', () => {
      expect(isValidTransition('confirmed', 'delivering')).toBe(false);
    });

    test('cooking → completed (skip ready, delivering)', () => {
      expect(isValidTransition('cooking', 'completed')).toBe(false);
    });

    test('cooking → delivering (skip ready)', () => {
      expect(isValidTransition('cooking', 'delivering')).toBe(false);
    });

    test('cooking → confirmed (backwards)', () => {
      expect(isValidTransition('cooking', 'confirmed')).toBe(false);
    });

    test('ready → completed (skip delivering)', () => {
      expect(isValidTransition('ready', 'completed')).toBe(false);
    });

    test('ready → cooking (backwards)', () => {
      expect(isValidTransition('ready', 'cooking')).toBe(false);
    });

    test('delivering → ready (backwards)', () => {
      expect(isValidTransition('delivering', 'ready')).toBe(false);
    });

    test('delivering → cancelled', () => {
      expect(isValidTransition('delivering', 'cancelled')).toBe(false);
    });
  });

  describe('terminal states', () => {
    test('completed has no valid transitions', () => {
      expect(isValidTransition('completed', 'new')).toBe(false);
      expect(isValidTransition('completed', 'confirmed')).toBe(false);
      expect(isValidTransition('completed', 'cooking')).toBe(false);
      expect(isValidTransition('completed', 'ready')).toBe(false);
      expect(isValidTransition('completed', 'delivering')).toBe(false);
      expect(isValidTransition('completed', 'cancelled')).toBe(false);
      expect(isValidTransition('completed', 'completed')).toBe(false);
    });

    test('cancelled has no valid transitions', () => {
      expect(isValidTransition('cancelled', 'new')).toBe(false);
      expect(isValidTransition('cancelled', 'confirmed')).toBe(false);
      expect(isValidTransition('cancelled', 'cooking')).toBe(false);
      expect(isValidTransition('cancelled', 'ready')).toBe(false);
      expect(isValidTransition('cancelled', 'delivering')).toBe(false);
      expect(isValidTransition('cancelled', 'completed')).toBe(false);
      expect(isValidTransition('cancelled', 'cancelled')).toBe(false);
    });
  });

  describe('unknown statuses', () => {
    test('unknown current status returns false', () => {
      expect(isValidTransition('unknown', 'confirmed')).toBe(false);
    });

    test('unknown target status returns false', () => {
      expect(isValidTransition('new', 'unknown')).toBe(false);
    });

    test('both unknown returns false', () => {
      expect(isValidTransition('foo', 'bar')).toBe(false);
    });

    test('empty string current returns false', () => {
      expect(isValidTransition('', 'confirmed')).toBe(false);
    });

    test('empty string target returns false', () => {
      expect(isValidTransition('new', '')).toBe(false);
    });
  });

  describe('self-transitions', () => {
    test('new → new is invalid', () => {
      expect(isValidTransition('new', 'new')).toBe(false);
    });

    test('confirmed → confirmed is invalid', () => {
      expect(isValidTransition('confirmed', 'confirmed')).toBe(false);
    });

    test('cooking → cooking is invalid', () => {
      expect(isValidTransition('cooking', 'cooking')).toBe(false);
    });

    test('ready → ready is invalid', () => {
      expect(isValidTransition('ready', 'ready')).toBe(false);
    });

    test('delivering → delivering is invalid', () => {
      expect(isValidTransition('delivering', 'delivering')).toBe(false);
    });
  });
});