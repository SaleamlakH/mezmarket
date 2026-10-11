import { describe, it, expect } from 'vitest';
import { convertToStandardQuantity, resolveToStandard, snapshotLines } from '../snapshot.js';
import {
  CATALOG,
  OIL,
  RICE,
  TEQUILA,
  unitOf,
  withUnit,
  withoutRole,
  type ProductFixture,
} from './snapshot.fixtures.js';
import { ERROR_CODES } from '../../errors/app-error.js';

/** A thrown AppError pinned by code and status only. */
function appError(code: string, statusCode: number) {
  return expect.objectContaining({ code, statusCode, message: expect.any(String) });
}

describe('snapshotLines', () => {
  const resolveLine = (product: ProductFixture, line: { quantity: number }) => ({
    productId: product.id,
    quantity: line.quantity,
  });

  it('resolves each line against the product that named it, in order', () => {
    expect(
      snapshotLines(
        CATALOG,
        'b-1',
        [
          { productId: 'p-tequila', quantity: 10 },
          { productId: 'p-tshirt', quantity: 5 },
        ],
        resolveLine,
      ),
    ).toEqual([
      { productId: 'p-tequila', quantity: 10 },
      { productId: 'p-tshirt', quantity: 5 },
    ]);
  });

  it('rejects a line naming a product the business does not have', () => {
    expect(() =>
      snapshotLines(CATALOG, 'b-1', [{ productId: 'p-unknown', quantity: 1 }], resolveLine),
    ).toThrow(appError(ERROR_CODES.NOT_FOUND, 404));
  });

  it('rejects a product belonging to another business', () => {
    const catalog = [{ ...TEQUILA, businessId: 'b-other' }];

    expect(() =>
      snapshotLines(catalog, 'b-1', [{ productId: 'p-tequila', quantity: 1 }], resolveLine),
    ).toThrow(appError(ERROR_CODES.NOT_FOUND, 404));
  });
});

describe('resolveToStandard', () => {
  it('keeps a base unit purchase in the base unit own standard unit', () => {
    expect(resolveToStandard(10, unitOf(TEQUILA, 'pu-bottle'), TEQUILA.productUnits)).toEqual({
      quantity: 10,
      id: 'su-pc',
      symbol: 'pc',
    });
  });

  it('walks a custom unit based on the base unit up to the base standard', () => {
    expect(resolveToStandard(3, unitOf(TEQUILA, 'pu-case'), TEQUILA.productUnits)).toEqual({
      quantity: 36,
      id: 'su-pc',
      symbol: 'pc',
    });
  });

  it('walks a custom unit based on the MOU up to the MOU standard', () => {
    expect(resolveToStandard(4, unitOf(TEQUILA, 'pu-shot'), TEQUILA.productUnits)).toEqual({
      quantity: 100,
      id: 'su-ml',
      symbol: 'ml',
    });
  });

  it('keeps a standard unit hanging off the MOU in its own standard unit', () => {
    expect(resolveToStandard(20, unitOf(TEQUILA, 'pu-liter'), TEQUILA.productUnits)).toEqual({
      quantity: 20,
      id: 'su-l',
      symbol: 'L',
    });
  });

  it('keeps a standard unit hanging off the base in its own standard unit', () => {
    expect(resolveToStandard(500, unitOf(RICE, 'pu-gram'), RICE.productUnits)).toEqual({
      quantity: 500,
      id: 'su-g',
      symbol: 'g',
    });
  });

  it('walks a custom unit based on the base unit of a weighed product', () => {
    expect(resolveToStandard(2, unitOf(RICE, 'pu-sack'), RICE.productUnits)).toEqual({
      quantity: 100,
      id: 'su-kg',
      symbol: 'kg',
    });
  });

  /**
   * A unit row that contradicts the catalog's own rules cannot be resolved to
   * anything: it is refused outright rather than guessed at.
   */
  describe('a unit chain that contradicts the catalog', () => {
    const CONTRADICTIONS: Array<{ name: string; product: ProductFixture; unitId: string }> = [
      {
        name: 'refuses a base unit that is linked to no standard unit',
        product: withUnit(TEQUILA, 'pu-bottle', { standardUnitId: null, standardUnit: null }),
        unitId: 'pu-bottle',
      },
      {
        name: 'refuses a measurement unit that is linked to no standard unit',
        product: withUnit(TEQUILA, 'pu-mou', { standardUnitId: null, standardUnit: null }),
        unitId: 'pu-mou',
      },
      {
        name: 'refuses a standard unit that is linked to no standard unit',
        product: withUnit(TEQUILA, 'pu-liter', { standardUnitId: null, standardUnit: null }),
        unitId: 'pu-liter',
      },
      {
        name: 'refuses a custom unit depending on a role the product does not have',
        product: withoutRole(TEQUILA, 'MOU'),
        unitId: 'pu-shot',
      },
      {
        name: 'refuses a custom unit linked to no unit to resolve through',
        product: withUnit(TEQUILA, 'pu-shot', { dependsOn: null }),
        unitId: 'pu-shot',
      },
    ];

    it.each(CONTRADICTIONS)('$name', ({ product, unitId }) => {
      expect(() => resolveToStandard(4, unitOf(product, unitId), product.productUnits)).toThrow(
        appError(ERROR_CODES.INTERNAL_ERROR, 500),
      );
    });
  });
});

describe('convertToStandardQuantity', () => {
  it('keeps a quantity already at the target role one-to-one', () => {
    expect(
      convertToStandardQuantity(TEQUILA.productUnits, unitOf(TEQUILA, 'pu-bottle'), 'BASE', 10),
    ).toBe(10);
  });

  it('multiplies a custom unit up to the role it depends on', () => {
    expect(
      convertToStandardQuantity(TEQUILA.productUnits, unitOf(TEQUILA, 'pu-shot'), 'MOU', 4),
    ).toBe(100);
  });

  it('divides an MOU down to the base unit through its pack relation', () => {
    expect(
      convertToStandardQuantity(TEQUILA.productUnits, unitOf(TEQUILA, 'pu-shot'), 'BASE', 4),
    ).toBe(100 / 350);
  });

  it('hops a standard unit over the MOU down to the base unit', () => {
    expect(
      convertToStandardQuantity(TEQUILA.productUnits, unitOf(TEQUILA, 'pu-liter'), 'BASE', 20),
    ).toBe(20000 / 350);
  });

  it('converts a standard unit whose rate is relative to the target role', () => {
    expect(convertToStandardQuantity(RICE.productUnits, unitOf(RICE, 'pu-gram'), 'BASE', 500)).toBe(
      0.5,
    );
    expect(convertToStandardQuantity(RICE.productUnits, unitOf(RICE, 'pu-sack'), 'BASE', 2)).toBe(
      100,
    );
  });

  it('converts oil bought by the liter or the milliliter through the oil MOU', () => {
    expect(
      convertToStandardQuantity(OIL.productUnits, unitOf(OIL, 'pu-oil-liter'), 'BASE', 20),
    ).toBe(4);
    expect(
      convertToStandardQuantity(OIL.productUnits, unitOf(OIL, 'pu-oil-mou'), 'BASE', 350),
    ).toBe(350 / 5000);
  });

  it('leaves a non-terminating fraction for the column to round', () => {
    expect(
      convertToStandardQuantity(TEQUILA.productUnits, unitOf(TEQUILA, 'pu-shot'), 'BASE', 3),
    ).toBe(75 / 350);
  });

  describe('a unit chain that contradicts the catalog', () => {
    const CONTRADICTIONS: Array<{ name: string; product: ProductFixture; unitId: string }> = [
      {
        name: 'refuses a custom unit with no conversion rate',
        product: withUnit(TEQUILA, 'pu-shot', { conversionRate: null }),
        unitId: 'pu-shot',
      },
      {
        name: 'refuses a standard unit with no conversion rate',
        product: withUnit(TEQUILA, 'pu-liter', { conversionRate: null }),
        unitId: 'pu-liter',
      },
      {
        name: 'refuses a standard unit linked to no unit to convert through',
        product: withUnit(TEQUILA, 'pu-liter', { dependsOn: null }),
        unitId: 'pu-liter',
      },
      {
        name: 'refuses a measurement unit with no pack relation',
        product: withUnit(OIL, 'pu-oil-mou', { conversionRate: null }),
        unitId: 'pu-oil-mou',
      },
      {
        name: 'refuses to convert through a measurement unit that has no pack relation',
        product: withUnit(OIL, 'pu-oil-mou', { conversionRate: null }),
        unitId: 'pu-oil-liter',
      },
    ];

    it.each(CONTRADICTIONS)('$name', ({ product, unitId }) => {
      expect(() =>
        convertToStandardQuantity(product.productUnits, unitOf(product, unitId), 'BASE', 4),
      ).toThrow(appError(ERROR_CODES.INTERNAL_ERROR, 500));
    });
  });
});
