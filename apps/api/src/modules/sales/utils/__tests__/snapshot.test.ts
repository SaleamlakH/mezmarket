import { describe, it, expect } from 'vitest';
import type { CreateSaleInput, ProductSellContext } from '../../sales.types.js';
import type { Prisma } from '../../../../../generated/prisma/client.js';
import { ERROR_CODES } from '../../../../shared/errors/app-error.js';
import type { ProductUnitContext } from '../../../../shared/types/unit.types.js';
import { snapshotSaleLines } from '../snapshot.js';

/** Stands in for a `Decimal` column: the code only ever calls toNumber. */
function decimal(value: number): Prisma.Decimal {
  return { toNumber: () => value } as unknown as Prisma.Decimal;
}

function unit(overrides: Partial<ProductUnitContext> = {}): ProductUnitContext {
  return {
    id: 'pu-bottle',
    productId: 'p-tequila',
    unitRole: 'BASE',
    standardUnitId: 'su-pc',
    standardUnit: { id: 'su-pc', name: 'Piece', symbol: 'pc' },
    name: 'Bottle',
    dependsOn: null,
    conversionRate: null,
    purchaseCapable: true,
    sellCapable: true,
    price: decimal(950),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

const TEQUILA: ProductSellContext = {
  id: 'p-tequila',
  businessId: 'b-1',
  name: 'Sierra Tequila 350 ml',
  currentSealedStock: decimal(100),
  productUnits: [
    unit(),
    unit({
      id: 'pu-case',
      unitRole: 'CUSTOM',
      standardUnitId: null,
      standardUnit: null,
      name: 'Case (12 bottles)',
      dependsOn: 'BASE',
      conversionRate: decimal(12),
      price: decimal(10800),
    }),
    unit({
      id: 'pu-notsellable',
      unitRole: 'STANDARD',
      standardUnitId: 'su-l',
      standardUnit: { id: 'su-l', name: 'Liter', symbol: 'L' },
      name: 'Liter',
      dependsOn: 'BASE',
      conversionRate: decimal(1),
      sellCapable: false,
      price: decimal(50),
    }),
    unit({ id: 'pu-noprice', name: 'Unpriced', price: null }),
  ],
};

function line(overrides: Partial<CreateSaleInput['lines'][number]> = {}) {
  return {
    productId: 'p-tequila',
    productUnitId: 'pu-bottle',
    quantity: 2,
    ...overrides,
  };
}

describe('snapshotSaleLines', () => {
  it('snapshots the sold unit, its standard unit and the price of the chosen unit', () => {
    const [resolved] = snapshotSaleLines([TEQUILA], 'b-1', [line()]);

    expect(resolved).toMatchObject({
      productName: 'Sierra Tequila 350 ml',
      soldUnit: 'Bottle',
      quantity: 2,
      quantityInStandardUnit: 2,
      unitPrice: 950,
    });
  });

  it('converts a custom unit to its standard and base quantity', () => {
    const [resolved] = snapshotSaleLines([TEQUILA], 'b-1', [line({ productUnitId: 'pu-case' })]);

    expect(resolved).toMatchObject({
      soldUnit: 'Case (12 bottles)',
      quantity: 2,
      quantityInStandardUnit: 24,
      quantityInBaseUnit: 24,
      unitPrice: 10800,
    });
  });

  it('rejects a unit that does not belong to the product under its field path', () => {
    expect(() =>
      snapshotSaleLines([TEQUILA], 'b-1', [line({ productUnitId: 'pu-elsewhere' })]),
    ).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        details: { 'lines.0.productUnitId': expect.any(String) },
      }),
    );
  });

  it('rejects a unit the product cannot be sold in under its field path', () => {
    expect(() =>
      snapshotSaleLines([TEQUILA], 'b-1', [line({ productUnitId: 'pu-notsellable' })]),
    ).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        details: { 'lines.0.productUnitId': expect.any(String) },
      }),
    );
  });

  it('rejects a sellable unit that carries no price under its field path', () => {
    expect(() =>
      snapshotSaleLines([TEQUILA], 'b-1', [line({ productUnitId: 'pu-noprice' })]),
    ).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        details: { 'lines.0.productUnitId': expect.any(String) },
      }),
    );
  });

  it('rejects a product the business does not have', () => {
    expect(() => snapshotSaleLines([TEQUILA], 'b-1', [line({ productId: 'p-unknown' })])).toThrow(
      expect.objectContaining({ code: ERROR_CODES.NOT_FOUND, statusCode: 404 }),
    );
  });
});
