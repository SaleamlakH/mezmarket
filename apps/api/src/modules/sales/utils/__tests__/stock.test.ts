import { describe, it, expect } from 'vitest';
import type { ProductSellContext, ResolvedSaleLine, StockLot } from '../../sales.types.js';
import type { Prisma } from '../../../../../generated/prisma/client.js';
import { ERROR_CODES } from '../../../../shared/errors/app-error.js';
import { allocateStock, enforceStockPolicy, sumBaseByProduct, sumDrawsByLot } from '../stock.js';

/** Stands in for a `Decimal` column: the code only ever calls toNumber. */
function decimal(value: number): Prisma.Decimal {
  return { toNumber: () => value } as unknown as Prisma.Decimal;
}

function product(overrides: Partial<ProductSellContext> = {}): ProductSellContext {
  return {
    id: 'p-tequila',
    businessId: 'b-1',
    name: 'Sierra Tequila 350 ml',
    currentSealedStock: decimal(100),
    productUnits: [],
    ...overrides,
  };
}

function lot(overrides: Partial<StockLot> = {}): StockLot {
  return {
    id: 'lot-1',
    productId: 'p-tequila',
    purchaseUnitCost: decimal(600),
    quantityRemaining: decimal(10),
    ...overrides,
  };
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

function appError(code: string, statusCode: number) {
  return expect.objectContaining({ code, statusCode, message: expect.any(String) });
}

describe('allocateStock', () => {
  it('allocates a line against the oldest lot first', () => {
    const [allocated] = allocateStock(
      [product()],
      [lot({ id: 'lot-old' }), lot({ id: 'lot-new', purchaseUnitCost: decimal(700) })],
      [line()],
      true,
    );

    expect(allocated?.allocations).toEqual([
      { stockBatchLineId: 'lot-old', quantityPulled: 2, unitCost: 600 },
    ]);
  });

  it('splits a line across lots when the oldest runs out', () => {
    const [allocated] = allocateStock(
      [product()],
      [lot({ id: 'lot-old', quantityRemaining: decimal(1) }), lot({ id: 'lot-new' })],
      [line({ quantity: 3, quantityInBaseUnit: 3 })],
      true,
    );

    expect(allocated?.allocations).toEqual([
      { stockBatchLineId: 'lot-old', quantityPulled: 1, unitCost: 600 },
      { stockBatchLineId: 'lot-new', quantityPulled: 2, unitCost: 600 },
    ]);
  });

  it('leaves an oversell unallocated but keeps the full draw on the line', () => {
    const [allocated] = allocateStock(
      [product({ currentSealedStock: decimal(1) })],
      [lot({ id: 'lot-old', quantityRemaining: decimal(1) })],
      [line({ quantity: 2, quantityInBaseUnit: 2 })],
      true,
    );

    expect(allocated?.allocations).toEqual([
      { stockBatchLineId: 'lot-old', quantityPulled: 1, unitCost: 600 },
    ]);
    expect(allocated?.quantityInBaseUnit).toBe(2);
  });
});

describe('enforceStockPolicy', () => {
  it('rejects a sale that would take stock below zero when disallowed', () => {
    expect(() =>
      enforceStockPolicy([product({ currentSealedStock: decimal(1) })], [line()], false),
    ).toThrow(appError(ERROR_CODES.BAD_REQUEST, 400));
  });

  it('allows a sale to run stock negative when permitted', () => {
    expect(() =>
      enforceStockPolicy([product({ currentSealedStock: decimal(1) })], [line()], true),
    ).not.toThrow();
  });
});

describe('sumBaseByProduct', () => {
  it('sums the base draw of every line of a product', () => {
    const decrements = sumBaseByProduct([
      line({ quantityInBaseUnit: 2 }),
      line({ quantityInBaseUnit: 12 }),
    ]);

    expect(decrements).toEqual([{ productId: 'p-tequila', amount: 14 }]);
  });
});

describe('sumDrawsByLot', () => {
  it('sums every line draw a lot receives into one decrement', () => {
    const decrements = sumDrawsByLot([
      line({ allocations: [{ stockBatchLineId: 'lot-1', quantityPulled: 2, unitCost: 600 }] }),
      line({ allocations: [{ stockBatchLineId: 'lot-1', quantityPulled: 3, unitCost: 600 }] }),
    ]);

    expect(decrements).toEqual([{ stockBatchLineId: 'lot-1', quantity: 5 }]);
  });
});
