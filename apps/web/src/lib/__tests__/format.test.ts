import { describe, expect, it } from 'vitest';
import {
  datetimeLocalToInstant,
  formatDateTime,
  formatMoney,
  instantToDatetimeLocalValue,
  pluralize,
} from '@/lib/format';

// The gap between a currency code and its amount is a non-breaking space.
describe('formatMoney', () => {
  it('returns nothing when there is no amount to show', () => {
    expect(formatMoney(null, 'ETB')).toBeUndefined();
    expect(formatMoney(undefined, 'ETB')).toBeUndefined();
  });

  it('formats a zero amount instead of treating it as missing', () => {
    expect(formatMoney(0, 'ETB')).toBe('ETB\u00a00.00');
  });

  it('groups thousands and always shows two fraction digits', () => {
    expect(formatMoney(850, 'ETB')).toBe('ETB\u00a0850.00');
    expect(formatMoney(1234.5, 'ETB')).toBe('ETB\u00a01,234.50');
  });

  it('rounds to the nearest cent', () => {
    expect(formatMoney(1234.567, 'ETB')).toBe('ETB\u00a01,234.57');
  });

  it('renders the currency it is given', () => {
    expect(formatMoney(10, 'USD')).toBe('$10.00');
  });

  it('prices per unit when a unit is given', () => {
    expect(formatMoney(850, 'ETB', 'kg')).toBe('ETB\u00a0850.00 / kg');
    expect(formatMoney(0, 'ETB', 'kg')).toBe('ETB\u00a00.00 / kg');
  });
});

describe('pluralize', () => {
  it('keeps the singular for exactly one', () => {
    expect(pluralize(1, 'product')).toBe('product');
  });

  it('uses the default plural for any other count', () => {
    expect(pluralize(0, 'product')).toBe('products');
    expect(pluralize(2, 'product')).toBe('products');
  });

  it('accepts an explicit plural for irregular words', () => {
    expect(pluralize(1, 'box', 'boxes')).toBe('box');
    expect(pluralize(3, 'box', 'boxes')).toBe('boxes');
  });
});

describe('formatDateTime', () => {
  it('renders an instant with both its day and clock time', () => {
    const formatted = formatDateTime('2026-01-05T09:30:00.000Z');

    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('datetime-local conversion', () => {
  it('shows an instant as local wall clock and round-trips it back unchanged', () => {
    const local = datetimeLocalToInstant('2026-01-05T09:30');

    expect(local).toMatch(/Z$/);
    expect(instantToDatetimeLocalValue(local)).toBe('2026-01-05T09:30');
  });

  it('returns nothing for a stored value that names no instant', () => {
    expect(instantToDatetimeLocalValue('')).toBe('');
    expect(instantToDatetimeLocalValue('soon')).toBe('');
  });

  it('leaves a blank field blank and passes an unreadable value through', () => {
    expect(datetimeLocalToInstant('')).toBe('');
    expect(datetimeLocalToInstant('soon')).toBe('soon');
  });
});
