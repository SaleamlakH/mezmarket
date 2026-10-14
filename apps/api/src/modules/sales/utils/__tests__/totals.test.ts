import { describe, it, expect } from 'vitest';
import type { ResolvedSaleLine } from '../../sales.types.js';
import { computeSaleTotals } from '../totals.js';

function line(overrides: Partial<ResolvedSaleLine> = {}): ResolvedSaleLine {
  return {
    productId: 'p-tequila',
    productName: 'Sierra Tequila 350 ml',
    productUnitId: 'pu-bottle',
    soldUnit: 'Bottle',
    quantity: 2,
    standardUnit: 'pc',
    quantityInStandardUnit: 2,
    quantityInBaseUnit: 2,
    resolvedStandardUnitId: 'su-pc',
    unitPrice: 950,
    allocations: [],
    ...overrides,
  };
}

describe('computeSaleTotals', () => {
  it('sums the lines into a subtotal', () => {
    // 2 x 950 = 1900
    expect(computeSaleTotals([line()], 0).subtotal).toBe(1900);
  });

  it('applies the tax rate to the subtotal', () => {
    // 1900 at 15% = 285; total = 2185
    expect(computeSaleTotals([line()], 0.15)).toEqual({
      subtotal: 1900,
      taxAmount: 285,
      total: 2185,
    });
  });

  it('charges no tax when the rate is zero', () => {
    expect(computeSaleTotals([line()], 0)).toMatchObject({ taxAmount: 0, total: 1900 });
  });

  it('rounds money to the precision the columns store', () => {
    // 3 x 950 = 2850; 7.5% = 213.75; total = 3063.75
    expect(computeSaleTotals([line({ quantity: 3 })], 0.075)).toEqual({
      subtotal: 2850,
      taxAmount: 213.75,
      total: 3063.75,
    });
  });
});
