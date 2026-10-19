import { describe, it, expect } from 'vitest';
import type {
  ProductUnitContext,
  StockBatchLineWithBatchRecord,
  StockBatchRecord,
} from '../../batches.types.js';
import type { Prisma } from '../../../../../generated/prisma/client.js';
import { toBatchDetail, toProductBatches } from '../mappers.js';

/** Stands in for a `Decimal` column: the mappers only ever call toNumber. */
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

const PRODUCT_UNITS: ProductUnitContext[] = [unit({ id: 'pu-bottle' })];

function lineRecord(overrides: Record<string, unknown> = {}) {
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
    createdAt: new Date('2026-02-01T09:00:00.000Z'),
    updatedAt: new Date('2026-02-01T09:00:00.000Z'),
    product: { name: 'Sierra Tequila 350 ml', brand: 'Sierra' },
    ...overrides,
  };
}

function batchRecord(overrides: Record<string, unknown> = {}): StockBatchRecord {
  return {
    id: 'sb-1',
    businessId: 'b-1',
    branchId: 'br-1',
    supplierName: 'Awash Mart',
    referenceNumber: null,
    batchDate: new Date('2026-02-01T09:00:00.000Z'),
    confirmedAt: new Date('2026-02-01T10:00:00.000Z'),
    receivedByMemberId: 'm-1',
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
    lines: [lineRecord()],
    receivedByMember: { id: 'm-1', name: 'me', role: 'OWNER' },
    ...overrides,
  } as StockBatchRecord;
}

function historyLine(overrides: Record<string, unknown> = {}): StockBatchLineWithBatchRecord {
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
    stockBatch: {
      id: 'sb-1',
      businessId: 'b-1',
      branchId: 'br-1',
      supplierName: 'Awash Mart',
      referenceNumber: 'INV-42',
      batchDate: new Date('2026-02-01T09:00:00.000Z'),
      confirmedAt: new Date('2026-02-01T10:00:00.000Z'),
      receivedByMemberId: 'm-1',
      createdAt: new Date('2026-02-01T10:00:00.000Z'),
      updatedAt: new Date('2026-02-01T10:00:00.000Z'),
    },
    ...overrides,
  } as StockBatchLineWithBatchRecord;
}

describe('toBatchDetail', () => {
  it('flattens the decimals, product labels and receiver into the wire batch', () => {
    const detail = toBatchDetail(batchRecord());

    expect(detail).toMatchObject({
      id: 'sb-1',
      supplierName: 'Awash Mart',
      referenceNumber: null,
      receivedBy: { id: 'm-1', name: 'me', role: 'OWNER' },
    });
    expect(detail.lines[0]).toMatchObject({
      productName: 'Sierra Tequila 350 ml',
      productBrand: 'Sierra',
      purchaseQuantity: 10,
      purchaseUnitCost: 950,
      standardQuantity: 10,
      quantityRemaining: 10,
    });
  });

  it('narrows a stored decimal to a plain number', () => {
    const detail = toBatchDetail(
      batchRecord({
        lines: [lineRecord({ purchaseQuantity: decimal(2.5), quantityRemaining: decimal(0) })],
      }),
    );

    expect(detail.lines[0]).toMatchObject({ purchaseQuantity: 2.5, quantityRemaining: 0 });
  });

  it('carries a null receiving member through', () => {
    const detail = toBatchDetail(batchRecord({ receivedByMemberId: null, receivedByMember: null }));

    expect(detail.receivedBy).toBeNull();
    expect(detail.receivedByMemberId).toBeNull();
  });
});

describe('toProductBatches', () => {
  it('groups the lines under the batch that carried them, newest batch first', () => {
    const older = historyLine({
      id: 'sbl-old',
      stockBatchId: 'sb-old',
      stockBatch: {
        ...historyLine().stockBatch,
        id: 'sb-old',
        batchDate: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    const newer = historyLine({
      id: 'sbl-new',
      stockBatchId: 'sb-new',
      stockBatch: {
        ...historyLine().stockBatch,
        id: 'sb-new',
        batchDate: new Date('2026-03-01T00:00:00.000Z'),
      },
    });

    const batches = toProductBatches([older, newer], PRODUCT_UNITS, 'Bottle');

    expect(batches.map((batch) => batch.id)).toEqual(['sb-new', 'sb-old']);
  });

  it('keeps every line of one batch in a single group', () => {
    const batches = toProductBatches(
      [historyLine({ id: 'sbl-a' }), historyLine({ id: 'sbl-b' })],
      PRODUCT_UNITS,
      'Bottle',
    );

    expect(batches).toHaveLength(1);
    expect(batches[0]?.lines.map((line) => line.id)).toEqual(['sbl-a', 'sbl-b']);
  });

  it('maps each grouped line to its purchase figures and remaining values', () => {
    const [batch] = toProductBatches([historyLine()], PRODUCT_UNITS, 'Bottle');

    expect(batch?.lines[0]).toEqual({
      id: 'sbl-1',
      purchaseQuantity: 10,
      purchaseUnit: 'Bottle',
      purchaseUnitCost: 950,
      standardQuantity: 10,
      standardUnit: 'pc',
      quantityRemaining: 10,
      baseUnit: 'Bottle',
      remainingPurchaseQuantity: 10,
      remainingCost: 9500,
      expiryDate: null,
    });
  });

  it('still lists a line once it no longer holds stock', () => {
    const [batch] = toProductBatches(
      [historyLine({ quantityRemaining: decimal(0) })],
      PRODUCT_UNITS,
      'Bottle',
    );

    expect(batch?.lines).toHaveLength(1);
    expect(batch?.lines[0]).toMatchObject({
      id: 'sbl-1',
      quantityRemaining: 0,
      remainingCost: 0,
      remainingPurchaseQuantity: 0,
    });
  });
});
