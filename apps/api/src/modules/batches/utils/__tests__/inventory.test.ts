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
  expiryTotalsOf,
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

describe('expiryTotalsOf', () => {
  const EXPIRY_BEFORE = new Date('2026-06-01T00:00:00.000Z');
  const SOON = new Date('2026-05-01T00:00:00.000Z');
  const LATER = new Date('2026-09-01T00:00:00.000Z');

  it('counts only the lots that expire before the cutoff and totals their remaining stock', () => {
    const totals = expiryTotalsOf(
      [
        line({ id: 'sbl-1', expiryDate: SOON, quantityRemaining: decimal(6) }),
        line({ id: 'sbl-2', expiryDate: LATER }),
      ],
      EXPIRY_BEFORE,
    );

    expect(totals).toEqual({ lotCount: 1, quantity: 6 });
  });

  it('includes expired lots in the cutoff totals', () => {
    const EXPIRED = new Date('2026-01-01T00:00:00.000Z');

    const totals = expiryTotalsOf(
      [
        line({ id: 'sbl-1', expiryDate: EXPIRED, quantityRemaining: decimal(4) }),
        line({ id: 'sbl-2', expiryDate: SOON, quantityRemaining: decimal(6) }),
      ],
      EXPIRY_BEFORE,
    );

    expect(totals).toEqual({ lotCount: 2, quantity: 10 });
  });

  it('skips lines with no expiry or nothing left', () => {
    const totals = expiryTotalsOf(
      [
        line({ id: 'sbl-1', expiryDate: null }),
        line({ id: 'sbl-2', expiryDate: SOON, quantityRemaining: decimal(0) }),
        line({ id: 'sbl-3', expiryDate: SOON, quantityRemaining: decimal(5) }),
      ],
      EXPIRY_BEFORE,
    );

    expect(totals).toEqual({ lotCount: 1, quantity: 5 });
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
      name: 'is low when the stock has fallen under the product threshold',
      stock: 4,
      threshold: 5,
      expected: 'LOW_STOCK',
    },
    {
      name: 'is in stock once the stock reaches the threshold exactly',
      stock: 5,
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
  it('adds the expiry figures of the lines still holding stock', () => {
    const summary = toProductInventorySummary(
      productRecord({
        stockBatchLines: [
          line({ expiryDate: new Date('2026-05-01T00:00:00.000Z'), quantityRemaining: decimal(6) }),
        ],
      }),
      new Map(),
      new Date('2026-06-01T00:00:00.000Z'),
    );

    expect(summary.expiry).toEqual({ lotCount: 1, quantity: 6 });
    expect(summary.totalCost).toBe(5700);
  });

  it('maps the live uploadId of the product into the summary', () => {
    const summary = toProductInventorySummary(
      productRecord(),
      new Map([['p-tequila', 'u-1']]),
      new Date('2026-06-01T00:00:00.000Z'),
    );

    expect(summary.uploadId).toBe('u-1');
  });
});
