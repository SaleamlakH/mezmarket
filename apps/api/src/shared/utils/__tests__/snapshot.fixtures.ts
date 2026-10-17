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
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/** Sealed products arrive whole or in packs of the base unit. */
export const TSHIRT: ProductFixture = {
  id: 'p-tshirt',
  businessId: 'b-1',
  productUnits: [
    unit({ id: 'pu-piece', productId: 'p-tshirt', name: 'Piece' }),
    unit({
      id: 'pu-pack',
      productId: 'p-tshirt',
      unitRole: 'CUSTOM',
      standardUnitId: null,
      standardUnit: null,
      name: 'Pack (6 pcs)',
      dependsOn: 'BASE',
      conversionRate: decimal(6),
    }),
  ],
};

/** A product whose units hang off both the base unit and an MOU. */
export const TEQUILA: ProductFixture = {
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
      id: 'pu-shot',
      productId: 'p-tequila',
      unitRole: 'CUSTOM',
      standardUnitId: null,
      standardUnit: null,
      name: 'Shot',
      dependsOn: 'MOU',
      conversionRate: decimal(25),
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
  ],
};

/** A weighed product: its base unit is already measurable, plus a finer standard. */
export const RICE: ProductFixture = {
  id: 'p-rice',
  businessId: 'b-1',
  productUnits: [
    unit({
      id: 'pu-kg',
      productId: 'p-rice',
      name: 'Kilogram',
      standardUnitId: 'su-kg',
      standardUnit: { id: 'su-kg', name: 'Kilogram', symbol: 'kg' },
    }),
    unit({
      id: 'pu-gram',
      productId: 'p-rice',
      unitRole: 'STANDARD',
      standardUnitId: 'su-g',
      standardUnit: { id: 'su-g', name: 'Gram', symbol: 'g' },
      name: 'Gram',
      dependsOn: 'BASE',
      conversionRate: decimal(0.001),
    }),
    unit({
      id: 'pu-sack',
      productId: 'p-rice',
      unitRole: 'CUSTOM',
      standardUnitId: null,
      standardUnit: null,
      name: 'Sack (50 kg)',
      dependsOn: 'BASE',
      conversionRate: decimal(50),
    }),
  ],
};

/**
 * An oil measured by volume, where the standard unit hangs off the MOU rather
 * than the base unit.
 */
export const OIL: ProductFixture = {
  id: 'p-oil',
  businessId: 'b-1',
  productUnits: [
    unit({ id: 'pu-oil-bottle', productId: 'p-oil', name: 'Bottle' }),
    unit({
      id: 'pu-oil-mou',
      productId: 'p-oil',
      unitRole: 'MOU',
      standardUnitId: 'su-ml',
      standardUnit: { id: 'su-ml', name: 'Milliliter', symbol: 'ml' },
      name: 'Milliliter',
      dependsOn: 'BASE',
      conversionRate: decimal(5000),
    }),
    unit({
      id: 'pu-oil-liter',
      productId: 'p-oil',
      unitRole: 'STANDARD',
      standardUnitId: 'su-l',
      standardUnit: { id: 'su-l', name: 'Liter', symbol: 'L' },
      name: 'Liter',
      dependsOn: 'MOU',
      conversionRate: decimal(1000),
    }),
  ],
};

export const CATALOG = [TEQUILA, TSHIRT, RICE, OIL];

export function unitOf(product: ProductFixture, id: string) {
  const found = product.productUnits.find((candidate) => candidate.id === id);

  if (!found) {
    throw new Error(`No unit ${id} on ${product.id}`);
  }

  return found;
}

/** The same product with one unit row altered, for the broken-catalog cases. */
export function withUnit(
  product: ProductFixture,
  id: string,
  overrides: Partial<ProductUnitContext>,
): ProductFixture {
  return {
    ...product,
    productUnits: product.productUnits.map((candidate) =>
      candidate.id === id ? { ...candidate, ...overrides } : candidate,
    ),
  };
}

/** The same product with every unit of one role dropped. */
export function withoutRole(
  product: ProductFixture,
  role: ProductUnitContext['unitRole'],
): ProductFixture {
  return {
    ...product,
    productUnits: product.productUnits.filter((candidate) => candidate.unitRole !== role),
  };
}
