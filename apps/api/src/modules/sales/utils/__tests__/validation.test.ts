import { describe, it, expect } from 'vitest';
import type { CreateSaleInput, ProductSellContext } from '../../sales.types.js';
import type { Prisma } from '../../../../../generated/prisma/client.js';
import { ERROR_CODES } from '../../../../shared/errors/app-error.js';
import type { ProductUnitContext } from '../../../../shared/types/unit.types.js';
import { assertSaleLines } from '../validation.js';

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
      id: 'pu-notsellable',
      name: 'Liter',
      unitRole: 'STANDARD',
      standardUnitId: 'su-l',
      standardUnit: { id: 'su-l', name: 'Liter', symbol: 'L' },
      dependsOn: 'BASE',
      conversionRate: decimal(1),
      sellCapable: false,
      price: decimal(50),
    }),
    unit({ id: 'pu-noprice', name: 'Unpriced', price: null }),
  ],
};

const TSHIRT: ProductSellContext = {
  id: 'p-tshirt',
  businessId: 'b-1',
  name: 'T-shirt',
  currentSealedStock: decimal(100),
  productUnits: [
    unit({ id: 'pu-shirt', productId: 'p-tshirt', name: 'Shirt', price: decimal(500) }),
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

describe('assertSaleLines', () => {
  it('accepts a sale whose units are sellable and whose stock covers the draw', () => {
    expect(() => assertSaleLines([TEQUILA, TSHIRT], 'b-1', [line()], false)).not.toThrow();
  });

  it('reports every non-sellable unit under its own field path', () => {
    const unsellableTshirt = {
      ...TSHIRT,
      productUnits: TSHIRT.productUnits.map((unit) => ({ ...unit, sellCapable: false })),
    };

    expect(() =>
      assertSaleLines(
        [TEQUILA, unsellableTshirt],
        'b-1',
        [
          line({ productUnitId: 'pu-notsellable' }),
          line({ productId: 'p-tshirt', productUnitId: 'pu-shirt', quantity: 1 }),
        ],
        false,
      ),
    ).toThrow(
      expect.objectContaining({
        details: {
          'lines.0.productUnitId': expect.any(String),
          'lines.1.productUnitId': expect.any(String),
        },
      }),
    );
  });

  it('reports every over-stocked product under its own field path', () => {
    expect(() =>
      assertSaleLines(
        [
          { ...TEQUILA, currentSealedStock: decimal(1) },
          { ...TSHIRT, currentSealedStock: decimal(0) },
        ],
        'b-1',
        [
          line({ quantity: 2 }),
          line({ productId: 'p-tshirt', productUnitId: 'pu-shirt', quantity: 1 }),
        ],
        false,
      ),
    ).toThrow(
      expect.objectContaining({
        details: {
          'lines.0.productId': expect.any(String),
          'lines.1.productId': expect.any(String),
        },
      }),
    );
  });

  it('reports unit and stock errors together', () => {
    expect(() =>
      assertSaleLines(
        [{ ...TEQUILA, currentSealedStock: decimal(1) }],
        'b-1',
        [line({ quantity: 2 }), line({ productUnitId: 'pu-noprice', quantity: 1 })],
        false,
      ),
    ).toThrow(
      expect.objectContaining({
        details: {
          'lines.1.productUnitId': expect.any(String),
          'lines.0.productId': expect.any(String),
        },
      }),
    );
  });

  it('still blocks an unusable unit when negative stock is allowed', () => {
    expect(() =>
      assertSaleLines([TEQUILA], 'b-1', [line({ productUnitId: 'pu-notsellable' })], true),
    ).toThrow(
      expect.objectContaining({
        details: { 'lines.0.productUnitId': expect.any(String) },
      }),
    );
  });

  it('rejects a product the business does not have', () => {
    expect(() =>
      assertSaleLines([TEQUILA], 'b-1', [line({ productId: 'p-unknown' })], false),
    ).toThrow(expect.objectContaining({ code: ERROR_CODES.NOT_FOUND, statusCode: 404 }));
  });
});
