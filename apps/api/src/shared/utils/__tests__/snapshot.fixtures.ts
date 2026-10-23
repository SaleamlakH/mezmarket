import type { ProductUnitContext } from '../../types/unit.types.js';
import type { Prisma } from '../../../../generated/prisma/client.js';

/** Stands in for a `Decimal` column: the walk only ever calls toNumber. */
export function decimal(value: number): Prisma.Decimal {
  return { toNumber: () => value } as unknown as Prisma.Decimal;
}

export type ProductFixture = {
  id: string;
  businessId: string;
  productUnits: ProductUnitContext[];
};

export function unit(overrides: Partial<ProductUnitContext> = {}): ProductUnitContext {
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

export const TSHIRT_PIECE = unit({ id: 'pu-piece', productId: 'p-tshirt', name: 'Piece' });
export const TSHIRT_PACK = unit({
  id: 'pu-pack',
  productId: 'p-tshirt',
  unitRole: 'CUSTOM',
  standardUnitId: null,
  standardUnit: null,
  name: 'Pack (6 pcs)',
  dependsOn: 'BASE',
  conversionRate: decimal(6),
});

/** Sealed products arrive whole or in packs of the base unit. */
export const TSHIRT: ProductFixture = {
  id: 'p-tshirt',
  businessId: 'b-1',
  productUnits: [TSHIRT_PIECE, TSHIRT_PACK],
};

export const TEQUILA_BOTTLE = unit({ id: 'pu-bottle', productId: 'p-tequila', name: 'Bottle' });
export const TEQUILA_MOU = unit({
  id: 'pu-mou',
  productId: 'p-tequila',
  unitRole: 'MOU',
  standardUnitId: 'su-ml',
  standardUnit: { id: 'su-ml', name: 'Milliliter', symbol: 'ml' },
  name: 'Milliliter',
  dependsOn: 'BASE',
  conversionRate: decimal(350),
  purchaseCapable: false,
});
export const TEQUILA_LITER = unit({
  id: 'pu-liter',
  productId: 'p-tequila',
  unitRole: 'STANDARD',
  standardUnitId: 'su-l',
  standardUnit: { id: 'su-l', name: 'Liter', symbol: 'L' },
  name: 'Liter',
  dependsOn: 'MOU',
  conversionRate: decimal(1000),
});
export const TEQUILA_SHOT = unit({
  id: 'pu-shot',
  productId: 'p-tequila',
  unitRole: 'CUSTOM',
  standardUnitId: null,
  standardUnit: null,
  name: 'Shot',
  dependsOn: 'MOU',
  conversionRate: decimal(25),
});
export const TEQUILA_CASE = unit({
  id: 'pu-case',
  productId: 'p-tequila',
  unitRole: 'CUSTOM',
  standardUnitId: null,
  standardUnit: null,
  name: 'Case (12 bottles)',
  dependsOn: 'BASE',
  conversionRate: decimal(12),
});

/** A product whose units hang off both the base unit and an MOU. */
export const TEQUILA: ProductFixture = {
  id: 'p-tequila',
  businessId: 'b-1',
  productUnits: [TEQUILA_BOTTLE, TEQUILA_MOU, TEQUILA_LITER, TEQUILA_SHOT, TEQUILA_CASE],
};

export const RICE_KG = unit({
  id: 'pu-kg',
  productId: 'p-rice',
  name: 'Kilogram',
  standardUnitId: 'su-kg',
  standardUnit: { id: 'su-kg', name: 'Kilogram', symbol: 'kg' },
});
export const RICE_GRAM = unit({
  id: 'pu-gram',
  productId: 'p-rice',
  unitRole: 'STANDARD',
  standardUnitId: 'su-g',
  standardUnit: { id: 'su-g', name: 'Gram', symbol: 'g' },
  name: 'Gram',
  dependsOn: 'BASE',
  conversionRate: decimal(0.001),
});
export const RICE_SACK = unit({
  id: 'pu-sack',
  productId: 'p-rice',
  unitRole: 'CUSTOM',
  standardUnitId: null,
  standardUnit: null,
  name: 'Sack (50 kg)',
  dependsOn: 'BASE',
  conversionRate: decimal(50),
});

/** A weighed product: its base unit is already measurable, plus a finer standard. */
export const RICE: ProductFixture = {
  id: 'p-rice',
  businessId: 'b-1',
  productUnits: [RICE_KG, RICE_GRAM, RICE_SACK],
};

export const OIL_BOTTLE = unit({ id: 'pu-oil-bottle', productId: 'p-oil', name: 'Bottle' });
export const OIL_MOU = unit({
  id: 'pu-oil-mou',
  productId: 'p-oil',
  unitRole: 'MOU',
  standardUnitId: 'su-ml',
  standardUnit: { id: 'su-ml', name: 'Milliliter', symbol: 'ml' },
  name: 'Milliliter',
  dependsOn: 'BASE',
  conversionRate: decimal(5000),
});
export const OIL_LITER = unit({
  id: 'pu-oil-liter',
  productId: 'p-oil',
  unitRole: 'STANDARD',
  standardUnitId: 'su-l',
  standardUnit: { id: 'su-l', name: 'Liter', symbol: 'L' },
  name: 'Liter',
  dependsOn: 'MOU',
  conversionRate: decimal(1000),
});

/**
 * An oil measured by volume, where the standard unit hangs off the MOU rather
 * than the base unit.
 */
export const OIL: ProductFixture = {
  id: 'p-oil',
  businessId: 'b-1',
  productUnits: [OIL_BOTTLE, OIL_MOU, OIL_LITER],
};

export const CATALOG = [TEQUILA, TSHIRT, RICE, OIL];
