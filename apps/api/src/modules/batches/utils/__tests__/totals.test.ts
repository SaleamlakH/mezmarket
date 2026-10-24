import { describe, it, expect } from 'vitest';
import type { ProductUnitContext } from '../../batches.types.js';
import type {
  Prisma,
  StockBatchLine as StockBatchLineRecord,
} from '../../../../../generated/prisma/client.js';
import { remainingCostOf, remainingPurchaseQuantityOf, sumInventoryTotals } from '../totals.js';

/** Stands in for a `Decimal` column: the code only ever calls toNumber. */
function decimal(value: number): Prisma.Decimal {
  return { toNumber: () => value } as unknown as Prisma.Decimal;
}

function unit(overrides: Partial<ProductUnitContext> = {}): ProductUnitContext {
  return {
    id: 'pu-base',
    productId: 'p-tequila',
    unitRole: 'BASE',
    standardUnitId: 'su-pc',
    standardUnit: { id: 'su-pc', name: 'Piece', symbol: 'pc' },
    name: 'Bottle',
    dependsOn: null,
    conversionRate: null,
    purchaseCapable: true,
    sellCapable: false,
    price: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/** A product selling by the bottle, bought by the liter. */
const BOTTLE = unit({ id: 'pu-bottle', productId: 'p-tequila' });
const ML = unit({
  id: 'pu-ml',
  productId: 'p-tequila',
  unitRole: 'MOU',
  standardUnitId: 'su-ml',
  standardUnit: { id: 'su-ml', name: 'Milliliter', symbol: 'ml' },
  name: 'Milliliter',
  dependsOn: 'BASE',
  conversionRate: decimal(350),
  purchaseCapable: false,
});
const LITER = unit({
  id: 'pu-liter',
  productId: 'p-tequila',
  unitRole: 'STANDARD',
  standardUnitId: 'su-l',
  standardUnit: { id: 'su-l', name: 'Liter', symbol: 'L' },
  name: 'Liter',
  dependsOn: 'MOU',
  conversionRate: decimal(1000),
});
const TEQUILA_UNITS: ProductUnitContext[] = [BOTTLE, ML, LITER];

function line(overrides: Partial<StockBatchLineRecord> = {}): StockBatchLineRecord {
  return {
    id: 'sbl-1',
    stockBatchId: 'sb-1',
    productId: 'p-tequila',
    purchaseUnit: 'Bottle',
    purchaseQuantity: decimal(10),
    purchaseUnitCost: decimal(950),
    standardUnit: 'pc',
    standardQuantity: decimal(10),
    productUnitId: 'pu-bottle',
    resolvedStandardUnitId: 'su-pc',
    quantityRemaining: decimal(10),
    expiryDate: null,
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('remainingCostOf', () => {
  it('prorates the remaining cost by the unsold share in base units, not in the units bought', () => {
    const cost = remainingCostOf(
      line({
        productUnitId: 'pu-liter',
        purchaseQuantity: decimal(7),
        purchaseUnitCost: decimal(2000),
        quantityRemaining: decimal(5),
      }),
      { sourceUnit: LITER, sourceBaseUnit: BOTTLE, mouUnit: ML },
    );

    // 7 L bought at 2000 = 14000 spread over 20 bottles (7 x 1000 ml / 350 ml);
    // the 5 bottles still sellable keep 14000 x (5 / 20), not 14000 x (5 / 7
    // liters) nor 14000 x (5 / 7000 ml).
    expect(cost).toBe(3500);
  });

  it('returns nothing for a line whose purchased unit is not in the product units', () => {
    expect(
      remainingCostOf(line({ productUnitId: 'pu-retired' }), {
        sourceUnit: null,
        sourceBaseUnit: BOTTLE,
        mouUnit: ML,
      }),
    ).toBe(0);
  });

  it('returns nothing for a line that bought no base quantity', () => {
    expect(
      remainingCostOf(line({ purchaseQuantity: decimal(0) }), {
        sourceUnit: BOTTLE,
        sourceBaseUnit: BOTTLE,
        mouUnit: ML,
      }),
    ).toBe(0);
  });
});

describe('remainingPurchaseQuantityOf', () => {
  it('prorates the remaining purchase quantity by the unsold share in base units', () => {
    const quantity = remainingPurchaseQuantityOf(
      line({
        productUnitId: 'pu-liter',
        purchaseQuantity: decimal(7),
        purchaseUnitCost: decimal(2000),
        quantityRemaining: decimal(5),
      }),
      { sourceUnit: LITER, sourceBaseUnit: BOTTLE, mouUnit: ML },
    );

    // 7 L bought over 20 bottles; the 5 bottles still sellable keep 7 x (5 / 20).
    expect(quantity).toBe(1.75);
  });

  it('returns nothing for a line whose purchased unit is not in the product units', () => {
    expect(
      remainingPurchaseQuantityOf(line({ productUnitId: 'pu-retired' }), {
        sourceUnit: null,
        sourceBaseUnit: BOTTLE,
        mouUnit: ML,
      }),
    ).toBe(0);
  });

  it('returns nothing for a line that bought no base quantity', () => {
    expect(
      remainingPurchaseQuantityOf(line({ purchaseQuantity: decimal(0) }), {
        sourceUnit: BOTTLE,
        sourceBaseUnit: BOTTLE,
        mouUnit: ML,
      }),
    ).toBe(0);
  });
});

describe('sumInventoryTotals', () => {
  it('sums the remaining cost across every line and counts the distinct batches', () => {
    const totals = sumInventoryTotals(
      [
        line({ id: 'sbl-1', purchaseQuantity: decimal(10), quantityRemaining: decimal(4) }),
        line({ id: 'sbl-2', purchaseUnitCost: decimal(100), quantityRemaining: decimal(5) }),
        line({
          id: 'sbl-3',
          stockBatchId: 'sb-2',
          purchaseUnitCost: decimal(20),
          quantityRemaining: decimal(10),
        }),
      ],
      TEQUILA_UNITS,
    );

    // 10x950x(4/10) + 10x100x(5/10) + 10x20x(10/10)
    expect(totals.totalCost).toBe(3800 + 500 + 200);
    expect(totals.batchIds.size).toBe(2);
  });

  it('is empty for a product with no lines', () => {
    const totals = sumInventoryTotals([], TEQUILA_UNITS);

    expect(totals.totalCost).toBe(0);
    expect(totals.batchIds.size).toBe(0);
  });
});
