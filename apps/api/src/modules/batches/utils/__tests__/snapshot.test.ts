import { describe, it, expect } from 'vitest';
import type { CreateBatchInput, ProductContext, ProductUnitContext } from '../../batches.types.js';
import type { Prisma } from '../../../../../generated/prisma/client.js';
import { ERROR_CODES } from '../../../../shared/errors/app-error.js';
import { snapshotBatchLines } from '../snapshot.js';

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

/**
 * A product whose units hang off the base unit, an MOU and a standard unit,
 * with custom units on both the base unit and the MOU. The rates are all
 * non-unit, so every conversion a batch line can take is exercised.
 *   bottle (BASE, pc) --350 ml--> milliliter (MOU, ml) --1000--> liter (STANDARD, L)
 *   case  (CUSTOM on BASE, 12)      shot (CUSTOM on MOU, 25)
 */
const TEQUILA: ProductContext = {
  id: 'p-tequila',
  businessId: 'b-1',
  productUnits: [
    unit({ id: 'pu-bottle', productId: 'p-tequila', name: 'Bottle' }),
    unit({
      id: 'pu-mou',
      productId: 'p-tequila',
      unitRole: 'MOU',
      standardUnitId: 'su-ml',
      standardUnit: { id: 'su-ml', name: 'Milliliter', symbol: 'ml' },
      name: 'Milliliter',
      dependsOn: 'BASE',
      conversionRate: decimal(350),
      purchaseCapable: false,
    }),
    unit({
      id: 'pu-liter',
      productId: 'p-tequila',
      unitRole: 'STANDARD',
      standardUnitId: 'su-l',
      standardUnit: { id: 'su-l', name: 'Liter', symbol: 'L' },
      name: 'Liter',
      dependsOn: 'MOU',
      conversionRate: decimal(1000),
    }),
    unit({
      id: 'pu-case',
      productId: 'p-tequila',
      unitRole: 'CUSTOM',
      standardUnitId: null,
      standardUnit: null,
      name: 'Case (12 bottles)',
      dependsOn: 'BASE',
      conversionRate: decimal(12),
    }),
    unit({
      id: 'pu-shot',
      productId: 'p-tequila',
      unitRole: 'CUSTOM',
      standardUnitId: null,
      standardUnit: null,
      name: 'Shot',
      dependsOn: 'MOU',
      conversionRate: decimal(25),
    }),
  ],
};

const CATALOG = [TEQUILA];

function line(overrides: Partial<CreateBatchInput['lines'][number]> = {}) {
  return {
    productId: 'p-tequila',
    productUnitId: 'pu-bottle',
    purchaseQuantity: 10,
    purchaseUnitCost: 950,
    ...overrides,
  };
}

function appError(code: string, statusCode: number) {
  return expect.objectContaining({ code, statusCode, message: expect.any(String) });
}

describe('snapshotBatchLines', () => {
  it('snapshots a base-unit purchase in the base unit own standard unit', () => {
    const [resolved] = snapshotBatchLines(CATALOG, 'b-1', [line()]);

    expect(resolved).toEqual({
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
    });
  });

  it('resolves a custom unit on the base unit to the base standard, converting by its rate', () => {
    const [resolved] = snapshotBatchLines(CATALOG, 'b-1', [
      line({ productUnitId: 'pu-case', purchaseQuantity: 3 }),
    ]);

    // 3 cases x 12 = 36 pieces; the custom unit has no standard unit of its own,
    // so it borrows the base unit's.
    expect(resolved).toMatchObject({
      purchaseUnit: 'Case (12 bottles)',
      standardUnit: 'pc',
      standardQuantity: 36,
      resolvedStandardUnitId: 'su-pc',
      stockIncrement: 36,
    });
  });

  it('resolves a standard unit bought in back to the base stock through the MOU', () => {
    const [resolved] = snapshotBatchLines(CATALOG, 'b-1', [
      line({ productUnitId: 'pu-liter', purchaseQuantity: 7 }),
    ]);

    // 7 L stays 7 L in its own standard unit, but reaches base stock through the
    // MOU: 7 x 1000 ml / 350 ml/bottle = 20 bottles.
    expect(resolved).toMatchObject({
      purchaseUnit: 'Liter',
      standardUnit: 'L',
      standardQuantity: 7,
      resolvedStandardUnitId: 'su-l',
      stockIncrement: 20,
    });
  });

  it('resolves a custom unit on the MOU through both rates to the base stock', () => {
    const [resolved] = snapshotBatchLines(CATALOG, 'b-1', [
      line({ productUnitId: 'pu-shot', purchaseQuantity: 14 }),
    ]);

    // 14 shots x 25 ml = 350 ml, which is exactly one bottle at the MOU rate.
    expect(resolved).toMatchObject({
      purchaseUnit: 'Shot',
      standardUnit: 'ml',
      standardQuantity: 350,
      resolvedStandardUnitId: 'su-ml',
      stockIncrement: 1,
    });
  });

  it('carries an expiry date through when the line has one', () => {
    const expiryDate = new Date('2027-01-01T00:00:00.000Z');

    const [resolved] = snapshotBatchLines(CATALOG, 'b-1', [line({ expiryDate })]);

    expect(resolved?.expiryDate).toEqual(expiryDate);
  });

  it('rejects a unit that is not one of that product units', () => {
    expect(() =>
      snapshotBatchLines(CATALOG, 'b-1', [line({ productUnitId: 'pu-elsewhere' })]),
    ).toThrow(appError(ERROR_CODES.BAD_REQUEST, 400));
  });

  it('rejects a unit the stock cannot be bought in', () => {
    expect(() => snapshotBatchLines(CATALOG, 'b-1', [line({ productUnitId: 'pu-mou' })])).toThrow(
      appError(ERROR_CODES.BAD_REQUEST, 400),
    );
  });

  it('rejects a product the business does not have', () => {
    expect(() => snapshotBatchLines(CATALOG, 'b-1', [line({ productId: 'p-unknown' })])).toThrow(
      appError(ERROR_CODES.NOT_FOUND, 404),
    );
  });
});
