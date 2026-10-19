import { describe, it, expect } from 'vitest';
import type { ResolvedBatchLine } from '../../batches.types.js';
import { sumStockByProduct } from '../stock.js';

function line(overrides: Partial<ResolvedBatchLine> = {}): ResolvedBatchLine {
  return {
    productId: 'p-tequila',
    productUnitId: 'pu-bottle',
    purchaseUnit: 'Bottle',
    purchaseQuantity: 10,
    purchaseUnitCost: 950,
    standardUnit: 'pc',
    standardQuantity: 10,
    resolvedStandardUnitId: 'su-pc',
    expiryDate: null,
    stockIncrement: 10,
    ...overrides,
  };
}

describe('sumStockByProduct', () => {
  it('sums the stock every line of one product contributes into a single increment', () => {
    const increments = sumStockByProduct([
      line({ stockIncrement: 12 }),
      line({ productUnitId: 'pu-piece', stockIncrement: 5 }),
    ]);

    expect(increments).toEqual([{ productId: 'p-tequila', amount: 17 }]);
  });

  it('keeps the stock of different products in separate increments', () => {
    const increments = sumStockByProduct([
      line({ productId: 'p-tequila', stockIncrement: 10 }),
      line({ productId: 'p-tshirt', stockIncrement: 5 }),
    ]);

    expect(increments).toEqual([
      { productId: 'p-tequila', amount: 10 },
      { productId: 'p-tshirt', amount: 5 },
    ]);
  });
});
