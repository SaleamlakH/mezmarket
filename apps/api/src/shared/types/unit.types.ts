import type {
  ProductUnit as ProductUnitRecord,
  StandardUnit,
} from '../../../generated/prisma/client.js';

export type StandardUnitContext = Pick<StandardUnit, 'id' | 'name' | 'symbol'>;

/**
 * A unit trimmed to what the hierarchy walk reads; `price` is sale-only.
 * A CUSTOM row carries a null `standardUnit`, which continues the walk.
 */
export type ProductUnitContext = Omit<ProductUnitRecord, 'price'> & {
  standardUnit: StandardUnitContext | null;
};
