import { batches, products, purchasableUnitsByProductId } from '../data/fixtures';

/**
 * The data the inventory page renders, for as long as the inventory
 * endpoints do not exist. When they do, this is the only piece that has to
 * change — every component already reads through it.
 */
export function useInventoryData() {
  return {
    batches,
    products,
    purchasableUnitsByProductId,
  };
}
