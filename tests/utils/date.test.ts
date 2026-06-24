import { describe, it, expect } from 'vitest';
import { getRelativeDate } from '../../src/utils/date.js';

describe('getRelativeDate', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = getRelativeDate(0);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns today when addDays is 0', () => {
    const result = getRelativeDate(0);
    const today = new Date().toISOString().slice(0, 10);
    expect(result).toBe(today);
  });

  it('returns a future date when addDays is positive', () => {
    const result = getRelativeDate(30);
    const today = new Date();
    const expected = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(result).toBe(expected.toISOString().slice(0, 10));
  });
});
