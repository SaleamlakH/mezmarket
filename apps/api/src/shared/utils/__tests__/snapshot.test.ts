import { describe, it, expect } from 'vitest';
import {
  conversionUnitsOf,
  convertToStandardQuantity,
  dependsOnUnitOf,
  quantityInBase,
  resolveToStandard,
  snapshotLines,
  unitCostPerBase,
} from '../snapshot.js';
import {
  CATALOG,
  decimal,
  OIL_BOTTLE,
  OIL_LITER,
  OIL_MOU,
  RICE,
  RICE_GRAM,
  RICE_KG,
  RICE_SACK,
  TEQUILA,
  TEQUILA_BOTTLE,
  TEQUILA_CASE,
  TEQUILA_LITER,
  TEQUILA_MOU,
  TEQUILA_SHOT,
  type ProductFixture,
} from './snapshot.fixtures.js';
import { ERROR_CODES } from '../../errors/app-error.js';
import type { ConversionUnits } from '../../types/unit.types.js';

/** A thrown AppError pinned by code and status only. */
function appError(code: string, statusCode: number) {
  return expect.objectContaining({ code, statusCode, message: expect.any(String) });
}

describe('conversionUnitsOf', () => {
  it('finds the source, base, and MOU units in one pass', () => {
    expect(conversionUnitsOf(TEQUILA.productUnits, 'pu-shot')).toEqual({
      sourceUnit: TEQUILA_SHOT,
      sourceBaseUnit: TEQUILA_BOTTLE,
      mouUnit: TEQUILA_MOU,
    });
  });

  it('leaves the source empty when the id is not on the product', () => {
    expect(conversionUnitsOf(TEQUILA.productUnits, 'pu-retired')).toEqual({
      sourceUnit: null,
      sourceBaseUnit: TEQUILA_BOTTLE,
      mouUnit: TEQUILA_MOU,
    });
  });

  it('leaves the source empty when there is no id to find', () => {
    expect(conversionUnitsOf(TEQUILA.productUnits, null)).toEqual({
      sourceUnit: null,
      sourceBaseUnit: TEQUILA_BOTTLE,
      mouUnit: TEQUILA_MOU,
    });
  });

  it('leaves the MOU empty when the product has none', () => {
    expect(conversionUnitsOf(RICE.productUnits, 'pu-sack')).toEqual({
      sourceUnit: RICE_SACK,
      sourceBaseUnit: RICE_KG,
      mouUnit: null,
    });
  });

  it('leaves the base empty when the product has none', () => {
    expect(conversionUnitsOf([RICE_GRAM], 'pu-gram')).toEqual({
      sourceUnit: RICE_GRAM,
      sourceBaseUnit: null,
      mouUnit: null,
    });
  });
});

describe('dependsOnUnitOf', () => {
  it('returns the base unit a custom unit depends on', () => {
    expect(
      dependsOnUnitOf({
        sourceUnit: TEQUILA_CASE,
        sourceBaseUnit: TEQUILA_BOTTLE,
        mouUnit: TEQUILA_MOU,
      }),
    ).toBe(TEQUILA_BOTTLE);
  });

  it('returns the MOU a unit depends on', () => {
    expect(
      dependsOnUnitOf({
        sourceUnit: TEQUILA_SHOT,
        sourceBaseUnit: TEQUILA_BOTTLE,
        mouUnit: TEQUILA_MOU,
      }),
    ).toBe(TEQUILA_MOU);
  });

  it('returns nothing when the source has no dependency', () => {
    expect(
      dependsOnUnitOf({
        sourceUnit: TEQUILA_BOTTLE,
        sourceBaseUnit: TEQUILA_BOTTLE,
        mouUnit: TEQUILA_MOU,
      }),
    ).toBeNull();
  });

  it('returns nothing when there is no source unit', () => {
    expect(
      dependsOnUnitOf({
        sourceUnit: null,
        sourceBaseUnit: TEQUILA_BOTTLE,
        mouUnit: TEQUILA_MOU,
      }),
    ).toBeNull();
  });

  it('returns nothing when the dependency role has no unit', () => {
    expect(
      dependsOnUnitOf({
        sourceUnit: TEQUILA_CASE,
        sourceBaseUnit: null,
        mouUnit: TEQUILA_MOU,
      }),
    ).toBeNull();
  });
});

describe('quantityInBase', () => {
  it('keeps a base-unit purchase one-to-one', () => {
    expect(
      quantityInBase(
        {
          sourceUnit: TEQUILA_BOTTLE,
          sourceBaseUnit: TEQUILA_BOTTLE,
          mouUnit: TEQUILA_MOU,
        },
        decimal(10),
      ),
    ).toBe(10);
  });

  it('converts a custom unit depending on the base unit', () => {
    expect(
      quantityInBase(
        {
          sourceUnit: TEQUILA_CASE,
          sourceBaseUnit: TEQUILA_BOTTLE,
          mouUnit: TEQUILA_MOU,
        },
        decimal(3),
      ),
    ).toBe(36);
  });

  it('converts a custom unit depending on the MOU across to base', () => {
    expect(
      quantityInBase(
        {
          sourceUnit: TEQUILA_SHOT,
          sourceBaseUnit: TEQUILA_BOTTLE,
          mouUnit: TEQUILA_MOU,
        },
        decimal(4),
      ),
    ).toBe(100 / 350);
  });

  it('converts a standard unit hanging off the MOU across to base', () => {
    expect(
      quantityInBase(
        {
          sourceUnit: TEQUILA_LITER,
          sourceBaseUnit: TEQUILA_BOTTLE,
          mouUnit: TEQUILA_MOU,
        },
        decimal(20),
      ),
    ).toBe(20000 / 350);
  });

  it('returns nothing when the source unit is missing', () => {
    expect(
      quantityInBase(
        {
          sourceUnit: null,
          sourceBaseUnit: TEQUILA_BOTTLE,
          mouUnit: TEQUILA_MOU,
        },
        decimal(10),
      ),
    ).toBe(0);
  });

  it('returns nothing when the purchase quantity is zero', () => {
    expect(
      quantityInBase(
        {
          sourceUnit: TEQUILA_BOTTLE,
          sourceBaseUnit: TEQUILA_BOTTLE,
          mouUnit: TEQUILA_MOU,
        },
        decimal(0),
      ),
    ).toBe(0);
  });
});

describe('unitCostPerBase', () => {
  it('spreads a purchase-unit cost across the base quantity', () => {
    expect(unitCostPerBase(2000, 20, 7)).toBe(700);
  });

  it('returns nothing when there are no base units', () => {
    expect(unitCostPerBase(2000, 0, 7)).toBe(0);
  });

  it('returns nothing when there is no purchase quantity', () => {
    expect(unitCostPerBase(2000, 20, 0)).toBe(0);
  });
});

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
    expect(
      resolveToStandard(10, {
        sourceUnit: TEQUILA_BOTTLE,
        sourceBaseUnit: TEQUILA_BOTTLE,
        mouUnit: TEQUILA_MOU,
      }),
    ).toEqual({
      quantity: 10,
      id: 'su-pc',
      symbol: 'pc',
    });
  });

  it('walks a custom unit based on the base unit up to the base standard', () => {
    expect(
      resolveToStandard(3, {
        sourceUnit: TEQUILA_CASE,
        sourceBaseUnit: TEQUILA_BOTTLE,
        mouUnit: TEQUILA_MOU,
      }),
    ).toEqual({
      quantity: 36,
      id: 'su-pc',
      symbol: 'pc',
    });
  });

  it('walks a custom unit based on the MOU up to the MOU standard', () => {
    expect(
      resolveToStandard(4, {
        sourceUnit: TEQUILA_SHOT,
        sourceBaseUnit: TEQUILA_BOTTLE,
        mouUnit: TEQUILA_MOU,
      }),
    ).toEqual({
      quantity: 100,
      id: 'su-ml',
      symbol: 'ml',
    });
  });

  it('keeps a standard unit hanging off the MOU in its own standard unit', () => {
    expect(
      resolveToStandard(20, {
        sourceUnit: TEQUILA_LITER,
        sourceBaseUnit: TEQUILA_BOTTLE,
        mouUnit: TEQUILA_MOU,
      }),
    ).toEqual({
      quantity: 20,
      id: 'su-l',
      symbol: 'L',
    });
  });

  it('keeps a standard unit hanging off the base in its own standard unit', () => {
    expect(
      resolveToStandard(500, {
        sourceUnit: RICE_GRAM,
        sourceBaseUnit: RICE_KG,
        mouUnit: null,
      }),
    ).toEqual({
      quantity: 500,
      id: 'su-g',
      symbol: 'g',
    });
  });

  it('walks a custom unit based on the base unit of a weighed product', () => {
    expect(
      resolveToStandard(2, {
        sourceUnit: RICE_SACK,
        sourceBaseUnit: RICE_KG,
        mouUnit: null,
      }),
    ).toEqual({
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
    const baseUnit = TEQUILA_BOTTLE;
    const mouUnit = TEQUILA_MOU;
    const CONTRADICTIONS: Array<{ name: string; units: ConversionUnits }> = [
      {
        name: 'refuses a base unit that is linked to no standard unit',
        units: {
          sourceUnit: { ...TEQUILA_BOTTLE, standardUnitId: null, standardUnit: null },
          sourceBaseUnit: baseUnit,
          mouUnit,
        },
      },
      {
        name: 'refuses a measurement unit that is linked to no standard unit',
        units: {
          sourceUnit: { ...TEQUILA_MOU, standardUnitId: null, standardUnit: null },
          sourceBaseUnit: baseUnit,
          mouUnit,
        },
      },
      {
        name: 'refuses a standard unit that is linked to no standard unit',
        units: {
          sourceUnit: { ...TEQUILA_LITER, standardUnitId: null, standardUnit: null },
          sourceBaseUnit: baseUnit,
          mouUnit,
        },
      },
      {
        name: 'refuses a custom unit depending on a role the product does not have',
        units: {
          sourceUnit: TEQUILA_SHOT,
          sourceBaseUnit: baseUnit,
          mouUnit: null,
        },
      },
      {
        name: 'refuses a custom unit linked to no unit to resolve through',
        units: {
          sourceUnit: { ...TEQUILA_SHOT, dependsOn: null },
          sourceBaseUnit: baseUnit,
          mouUnit,
        },
      },
    ];

    it.each(CONTRADICTIONS)('$name', ({ units }) => {
      expect(() => resolveToStandard(4, units)).toThrow(appError(ERROR_CODES.INTERNAL_ERROR, 500));
    });
  });
});

describe('convertToStandardQuantity', () => {
  it('keeps a quantity already at the target role one-to-one', () => {
    expect(
      convertToStandardQuantity(
        {
          sourceUnit: TEQUILA_BOTTLE,
          sourceBaseUnit: TEQUILA_BOTTLE,
          mouUnit: TEQUILA_MOU,
        },
        'BASE',
        10,
      ),
    ).toBe(10);
  });

  it('multiplies a custom unit up to the role it depends on', () => {
    expect(
      convertToStandardQuantity(
        {
          sourceUnit: TEQUILA_SHOT,
          sourceBaseUnit: TEQUILA_BOTTLE,
          mouUnit: TEQUILA_MOU,
        },
        'MOU',
        4,
      ),
    ).toBe(100);
  });

  it('divides an MOU down to the base unit through its pack relation', () => {
    expect(
      convertToStandardQuantity(
        {
          sourceUnit: TEQUILA_SHOT,
          sourceBaseUnit: TEQUILA_BOTTLE,
          mouUnit: TEQUILA_MOU,
        },
        'BASE',
        4,
      ),
    ).toBe(100 / 350);
  });

  it('hops a standard unit over the MOU down to the base unit', () => {
    expect(
      convertToStandardQuantity(
        {
          sourceUnit: TEQUILA_LITER,
          sourceBaseUnit: TEQUILA_BOTTLE,
          mouUnit: TEQUILA_MOU,
        },
        'BASE',
        20,
      ),
    ).toBe(20000 / 350);
  });

  it('converts a standard unit whose rate is relative to the target role', () => {
    expect(
      convertToStandardQuantity(
        {
          sourceUnit: RICE_GRAM,
          sourceBaseUnit: RICE_KG,
          mouUnit: null,
        },
        'BASE',
        500,
      ),
    ).toBe(0.5);
    expect(
      convertToStandardQuantity(
        {
          sourceUnit: RICE_SACK,
          sourceBaseUnit: RICE_KG,
          mouUnit: null,
        },
        'BASE',
        2,
      ),
    ).toBe(100);
  });

  it('converts oil bought by the liter or the milliliter through the oil MOU', () => {
    expect(
      convertToStandardQuantity(
        {
          sourceUnit: OIL_LITER,
          sourceBaseUnit: OIL_BOTTLE,
          mouUnit: OIL_MOU,
        },
        'BASE',
        20,
      ),
    ).toBe(4);
    expect(
      convertToStandardQuantity(
        {
          sourceUnit: OIL_MOU,
          sourceBaseUnit: OIL_BOTTLE,
          mouUnit: OIL_MOU,
        },
        'BASE',
        350,
      ),
    ).toBe(350 / 5000);
  });

  it('leaves a non-terminating fraction for the column to round', () => {
    expect(
      convertToStandardQuantity(
        {
          sourceUnit: TEQUILA_SHOT,
          sourceBaseUnit: TEQUILA_BOTTLE,
          mouUnit: TEQUILA_MOU,
        },
        'BASE',
        3,
      ),
    ).toBe(75 / 350);
  });

  describe('a unit chain that contradicts the catalog', () => {
    const baseUnit = TEQUILA_BOTTLE;
    const mouUnit = TEQUILA_MOU;
    const brokenOilMou = { ...OIL_MOU, conversionRate: null };
    const CONTRADICTIONS: Array<{ name: string; units: ConversionUnits }> = [
      {
        name: 'refuses a custom unit with no conversion rate',
        units: {
          sourceUnit: { ...TEQUILA_SHOT, conversionRate: null },
          sourceBaseUnit: baseUnit,
          mouUnit,
        },
      },
      {
        name: 'refuses a standard unit with no conversion rate',
        units: {
          sourceUnit: { ...TEQUILA_LITER, conversionRate: null },
          sourceBaseUnit: baseUnit,
          mouUnit,
        },
      },
      {
        name: 'refuses a standard unit linked to no unit to convert through',
        units: {
          sourceUnit: { ...TEQUILA_LITER, dependsOn: null },
          sourceBaseUnit: baseUnit,
          mouUnit,
        },
      },
      {
        name: 'refuses a measurement unit with no pack relation',
        units: {
          sourceUnit: brokenOilMou,
          sourceBaseUnit: OIL_BOTTLE,
          mouUnit: brokenOilMou,
        },
      },
      {
        name: 'refuses to convert through a measurement unit that has no pack relation',
        units: {
          sourceUnit: OIL_LITER,
          sourceBaseUnit: OIL_BOTTLE,
          mouUnit: brokenOilMou,
        },
      },
    ];

    it.each(CONTRADICTIONS)('$name', ({ units }) => {
      expect(() => convertToStandardQuantity(units, 'BASE', 4)).toThrow(
        appError(ERROR_CODES.INTERNAL_ERROR, 500),
      );
    });
  });
});
