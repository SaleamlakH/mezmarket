import { describe, it, expect } from 'vitest';
import type { ResolvedSaleLine } from '../../sales.types.js';
import { ERROR_CODES } from '../../../../shared/errors/app-error.js';
import { computeSaleTotals } from '../totals.js';

/** A thrown AppError pinned by code and status only. */
function appError(code: string, statusCode: number) {
  return expect.objectContaining({ code, statusCode, message: expect.any(String) });
}

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
    expect(
      computeSaleTotals(
        [
          line({
            quantity: 2,
            unitPrice: 950,
          }),
        ],
        0,
      ).subtotal,
    ).toBe(1900);
  });

  it('applies the tax rate to the subtotal', () => {
    // 1900 at 15% = 285; total = 2185
    expect(
      computeSaleTotals(
        [
          line({
            quantity: 2,
            unitPrice: 950,
          }),
        ],
        15,
      ),
    ).toEqual({
      subtotal: 1900,
      taxAmount: 285,
      total: 2185,
    });
  });

  it('charges no tax when the rate is zero', () => {
    expect(
      computeSaleTotals(
        [
          line({
            quantity: 2,
            unitPrice: 950,
          }),
        ],
        0,
      ),
    ).toMatchObject({ taxAmount: 0, total: 1900 });
  });

  it('rounds money to the precision the columns store', () => {
    // 3 x 950 = 2850; 7.5% = 213.75; total = 3063.75
    expect(
      computeSaleTotals(
        [
          line({
            quantity: 3,
            unitPrice: 950,
          }),
        ],
        7.5,
      ),
    ).toEqual({
      subtotal: 2850,
      taxAmount: 213.75,
      total: 3063.75,
    });
  });

  it('subtracts a whole-sale discount before tax', () => {
    // 2 x 950 = 1900; less 100 = 1800; 15% = 270; total = 2070
    expect(
      computeSaleTotals(
        [
          line({
            quantity: 2,
            unitPrice: 950,
          }),
        ],
        15,
        100,
      ),
    ).toEqual({
      subtotal: 1900,
      taxAmount: 270,
      total: 2070,
    });
  });

  it('reduces the total by a discount when there is no tax', () => {
    // subtotal 100, discount 10 -> total 90
    expect(
      computeSaleTotals(
        [
          line({
            quantity: 1,
            unitPrice: 100,
          }),
        ],
        0,
        10,
      ),
    ).toEqual({
      subtotal: 100,
      taxAmount: 0,
      total: 90,
    });
  });

  it('refuses a discount larger than the subtotal', () => {
    expect(() =>
      computeSaleTotals(
        [
          line({
            quantity: 2,
            unitPrice: 950,
          }),
        ],
        0,
        5000,
      ),
    ).toThrow(appError(ERROR_CODES.BAD_REQUEST, 400));
  });

  it('allows a discount equal to the subtotal', () => {
    expect(
      computeSaleTotals(
        [
          line({
            quantity: 2,
            unitPrice: 950,
          }),
        ],
        0,
        1900,
      ),
    ).toEqual({
      subtotal: 1900,
      taxAmount: 0,
      total: 0,
    });
  });

  it('treats a missing discount as none', () => {
    expect(
      computeSaleTotals(
        [
          line({
            quantity: 2,
            unitPrice: 950,
          }),
        ],
        15,
      ),
    ).toEqual(
      computeSaleTotals(
        [
          line({
            quantity: 2,
            unitPrice: 950,
          }),
        ],
        15,
        undefined,
      ),
    );
  });
});
