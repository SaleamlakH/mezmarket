import type { ProductInventoryBatchResponse } from '@mez/types';

/** What a product physically holds in one of the units it was bought in. */
export interface UnitStockGroup {
  /** The purchase unit the stock arrived in, e.g. `Sack`. */
  purchaseUnit: string;
  /** The product's base unit the quantity is counted in, e.g. `Kilogram`. */
  baseUnit: string;
  /** How much of the purchase unit is still on hand. */
  purchaseUnitRemaining: number;
  /** Total still on hand in this unit, in base units. */
  baseQuantityRemaining: number;
  /** How many lines hold the stock. */
  lineCount: number;
}

/**
 * Groups the lines still holding stock by the unit they were bought in, so the
 * physical quantities read the way they arrived. A line with nothing left is
 * left out: this section is what exists on the shelf, not the full history.
 */
export function groupLinesByUnit(
  batches: readonly ProductInventoryBatchResponse[],
): UnitStockGroup[] {
  const groups = new Map<string, UnitStockGroup>();

  for (const batch of batches) {
    for (const line of batch.lines) {
      if (line.quantityRemaining <= 0) continue;

      const group = groups.get(line.purchaseUnit) ?? {
        purchaseUnit: line.purchaseUnit,
        baseUnit: line.baseUnit,
        purchaseUnitRemaining: 0,
        baseQuantityRemaining: 0,
        lineCount: 0,
      };

      group.purchaseUnitRemaining += line.remainingPurchaseQuantity;
      group.baseQuantityRemaining += line.quantityRemaining;
      group.lineCount += 1;
      groups.set(line.purchaseUnit, group);
    }
  }

  return [...groups.values()];
}
