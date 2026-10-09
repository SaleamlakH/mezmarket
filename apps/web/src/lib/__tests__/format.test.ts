import { describe, expect, it } from 'vitest';
import { formatMoney, pluralize } from '@/lib/format';
import { dateInputToInstant, instantToDateInputValue } from '../format';

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

describe('date input conversion', () => {
  it('reads the calendar day off a stored instant without shifting it', () => {
    expect(instantToDateInputValue('2026-01-05T00:00:00.000Z')).toBe('2026-01-05');
    expect(instantToDateInputValue('')).toBe('');
  });

  it('records a picked day as the UTC instant, round-tripping either way', () => {
    const instant = dateInputToInstant('2026-01-05');

    expect(instant).toBe('2026-01-05T00:00:00.000Z');
    expect(instantToDateInputValue(instant)).toBe('2026-01-05');
  });

  it('leaves a blank field blank and passes an unreadable value through', () => {
    expect(dateInputToInstant('')).toBe('');
    expect(dateInputToInstant('soon')).toBe('soon');
  });
});
