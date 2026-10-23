import type {
  ProductUnit as ProductUnitRecord,
  StandardUnit,
} from '../../../generated/prisma/client.js';

export type StandardUnitContext = Pick<StandardUnit, 'id' | 'name' | 'symbol'>;

/**
 * A product unit with its standard unit. A CUSTOM row carries a null
 * `standardUnit`, which continues the walk.
 */
export type ProductUnitContext = ProductUnitRecord & {
  standardUnit: StandardUnitContext | null;
};

/**
 * The units a conversion needs: the unit the quantity was recorded in, that
 * unit's product Base Unit, and the product MOU when one exists.
 */
export type ConversionUnits = {
  sourceUnit: ProductUnitContext | null;
  sourceBaseUnit: ProductUnitContext | null;
  mouUnit: ProductUnitContext | null;
};
