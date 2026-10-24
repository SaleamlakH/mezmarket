import { describe, it, expect } from 'vitest';
import type { ProductUnitContext, ProductWithStockLinesRecord } from '../../batches.types.js';
import type {
  Prisma,
  StockBatchLine as StockBatchLineRecord,
} from '../../../../../generated/prisma/client.js';
import { ERROR_CODES } from '../../../../shared/errors/app-error.js';
import {
  baseUnitOf,
  buildProductInventoryStock,
  expiryBreakdownOf,
  stockStatusOf,
  toProductInventorySummary,
} from '../inventory.js';

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

function productRecord(
  overrides: Partial<ProductWithStockLinesRecord> = {},
): ProductWithStockLinesRecord {
  return {
    id: 'p-tequila',
    businessId: 'b-1',
    branchId: 'br-1',
    categoryId: null,
    name: 'Sierra Tequila 350 ml',
    brand: 'Sierra',
    description: null,
    photoUrl: null,
    trackAsPartial: false,
    lowStockThreshold: decimal(5),
    currentSealedStock: decimal(10),
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    productUnits: [unit({ id: 'pu-bottle' })],
    stockBatchLines: [line()],
    ...overrides,
  } as ProductWithStockLinesRecord;
}

describe('baseUnitOf', () => {
  it('reads the base unit every stock figure is expressed in', () => {
    expect(baseUnitOf(productRecord()).name).toBe('Bottle');
  });

  it('fails when the product has no base unit', () => {
    expect(() => baseUnitOf(productRecord({ productUnits: [] }))).toThrow(
      expect.objectContaining({ code: ERROR_CODES.INTERNAL_ERROR, statusCode: 500 }),
    );
  });
});

describe('expiryBreakdownOf', () => {
  const AS_OF = new Date('2026-06-01T00:00:00.000Z');
  const CUTOFF = new Date('2026-06-08T00:00:00.000Z');

  it('splits expired lots from lots expiring by the display cutoff', () => {
    const expiry = expiryBreakdownOf(
      [
        line({
          id: 'sbl-expired',
          expiryDate: new Date('2026-05-01T00:00:00.000Z'),
          quantityRemaining: decimal(4),
        }),
        line({
          id: 'sbl-soon',
          expiryDate: new Date('2026-06-05T00:00:00.000Z'),
          quantityRemaining: decimal(6),
        }),
        line({
          id: 'sbl-later',
          expiryDate: new Date('2026-06-20T00:00:00.000Z'),
          quantityRemaining: decimal(9),
        }),
      ],
      AS_OF,
      CUTOFF,
    );

    expect(expiry).toEqual({
      expired: {
        lotCount: 1,
        quantity: 4,
        earliestExpiryDate: '2026-05-01T00:00:00.000Z',
      },
      soon: {
        lotCount: 1,
        quantity: 6,
        earliestExpiryDate: '2026-06-05T00:00:00.000Z',
      },
    });
  });

  it('treats a lot expiring at the request instant as soon, not expired', () => {
    const expiry = expiryBreakdownOf(
      [line({ expiryDate: AS_OF, quantityRemaining: decimal(3) })],
      AS_OF,
      CUTOFF,
    );

    expect(expiry.expired.lotCount).toBe(0);
    expect(expiry.soon).toEqual({
      lotCount: 1,
      quantity: 3,
      earliestExpiryDate: AS_OF.toISOString(),
    });
  });

  it('includes a lot exactly at the display cutoff in soon', () => {
    const expiry = expiryBreakdownOf(
      [line({ expiryDate: CUTOFF, quantityRemaining: decimal(2) })],
      AS_OF,
      CUTOFF,
    );

    expect(expiry.expired.lotCount).toBe(0);
    expect(expiry.soon.lotCount).toBe(1);
  });

  it('skips lines with no expiry', () => {
    const expiry = expiryBreakdownOf([line({ id: 'sbl-none', expiryDate: null })], AS_OF, CUTOFF);

    expect(expiry).toEqual({
      expired: { lotCount: 0, quantity: 0, earliestExpiryDate: null },
      soon: { lotCount: 0, quantity: 0, earliestExpiryDate: null },
    });
  });

  it('tracks the earliest expiry inside each group', () => {
    const expiry = expiryBreakdownOf(
      [
        line({ id: 'sbl-expired-a', expiryDate: new Date('2026-05-20T00:00:00.000Z') }),
        line({ id: 'sbl-expired-b', expiryDate: new Date('2026-05-10T00:00:00.000Z') }),
        line({ id: 'sbl-soon-a', expiryDate: new Date('2026-06-06T00:00:00.000Z') }),
        line({ id: 'sbl-soon-b', expiryDate: new Date('2026-06-03T00:00:00.000Z') }),
      ],
      AS_OF,
      CUTOFF,
    );

    expect(expiry.expired.earliestExpiryDate).toBe('2026-05-10T00:00:00.000Z');
    expect(expiry.soon.earliestExpiryDate).toBe('2026-06-03T00:00:00.000Z');
  });
});

describe('stockStatusOf', () => {
  const CASES: Array<{
    name: string;
    stock: number;
    threshold: number | null;
    expected: string;
  }> = [
    {
      name: 'is out of stock when nothing is left',
      stock: 0,
      threshold: 5,
      expected: 'OUT_OF_STOCK',
    },
    {
      name: 'is out of stock when the figure has gone negative',
      stock: -1,
      threshold: 5,
      expected: 'OUT_OF_STOCK',
    },
    {
      name: 'is low when the stock is at the product threshold',
      stock: 5,
      threshold: 5,
      expected: 'LOW_STOCK',
    },
    {
      name: 'is in stock once the stock is above the product threshold',
      stock: 6,
      threshold: 5,
      expected: 'IN_STOCK',
    },
    {
      name: 'treats a product that has stock with no threshold as in stock',
      stock: 1,
      threshold: null,
      expected: 'IN_STOCK',
    },
    {
      name: 'is out of stock if nothing is left for a product with no threshold',
      stock: 0,
      threshold: null,
      expected: 'OUT_OF_STOCK',
    },
  ];

  it.each(CASES)('$name', ({ stock, threshold, expected }) => {
    expect(stockStatusOf(stock, threshold)).toBe(expected);
  });
});

describe('buildProductInventoryStock', () => {
  it('builds the header from the lines still holding stock', () => {
    const header = buildProductInventoryStock(productRecord(), [line()], null);

    expect(header).toEqual({
      id: 'p-tequila',
      name: 'Sierra Tequila 350 ml',
      brand: 'Sierra',
      currentSealedStock: 10,
      lowStockThreshold: 5,
      active: true,
      baseUnitLabel: 'Bottle',
      uploadId: null,
      totalCost: 9500,
      numberOfBatches: 1,
      stockStatus: 'IN_STOCK',
    });
  });
});

describe('toProductInventorySummary', () => {
  const AS_OF = new Date('2026-06-01T00:00:00.000Z');
  const CUTOFF = new Date('2026-06-08T00:00:00.000Z');

  it('adds the expiry figures of the lines still holding stock', () => {
    const summary = toProductInventorySummary(
      productRecord({
        stockBatchLines: [
          line({ expiryDate: new Date('2026-05-01T00:00:00.000Z'), quantityRemaining: decimal(6) }),
        ],
      }),
      new Map(),
      AS_OF,
      CUTOFF,
    );

    expect(summary.expiry).toEqual({
      expired: {
        lotCount: 1,
        quantity: 6,
        earliestExpiryDate: '2026-05-01T00:00:00.000Z',
      },
      soon: { lotCount: 0, quantity: 0, earliestExpiryDate: null },
    });
    expect(summary.totalCost).toBe(5700);
  });

  it('reads the earliest expiry across the lots still holding stock', () => {
    const summary = toProductInventorySummary(
      productRecord({
        stockBatchLines: [
          line({ id: 'sbl-a', expiryDate: new Date('2026-05-20T00:00:00.000Z') }),
          line({ id: 'sbl-b', expiryDate: new Date('2026-05-10T00:00:00.000Z') }),
        ],
      }),
      new Map(),
      AS_OF,
      CUTOFF,
    );

    expect(summary.expiry.expired.earliestExpiryDate).toBe('2026-05-10T00:00:00.000Z');
  });

  it('maps the live uploadId of the product into the summary', () => {
    const summary = toProductInventorySummary(
      productRecord(),
      new Map([['p-tequila', 'u-1']]),
      AS_OF,
      CUTOFF,
    );

    expect(summary.uploadId).toBe('u-1');
  });
});
