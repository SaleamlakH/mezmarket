import type { ProductBatchLineRow } from './flattenProductBatchLines';

/** What a product physically holds in one of the units it was bought in. */
export interface UnitStockGroup {
  /** The purchase unit the stock arrived in, e.g. `Sack`. */
  purchaseUnit: string;
  /** The product's standard unit the quantity is counted in, e.g. `kg`. */
  standardUnit: string;
  /** How much of the standard unit one purchase unit is worth, e.g. 50. */
  baseEquivalent: number;
  /** Total still on hand in this unit, in standard units. */
  quantityRemaining: number;
  /** How many lines hold the stock. */
  lineCount: number;
}

/**
 * Groups the lines still holding stock by the unit they were bought in, so the
 * physical quantities read the way they arrived. A line with nothing left is
 * left out: this section is what exists on the shelf, not the full history.
 */
export function groupLinesByUnit(rows: readonly ProductBatchLineRow[]): UnitStockGroup[] {
  const groups = new Map<string, UnitStockGroup>();

  for (const { line } of rows) {
    if (line.quantityRemaining <= 0) continue;

    const group = groups.get(line.purchaseUnit) ?? {
      purchaseUnit: line.purchaseUnit,
      standardUnit: line.standardUnit,
      baseEquivalent: line.purchaseQuantity > 0 ? line.standardQuantity / line.purchaseQuantity : 1,
      quantityRemaining: 0,
      lineCount: 0,
    };

    group.quantityRemaining += line.quantityRemaining;
    group.lineCount += 1;
    groups.set(line.purchaseUnit, group);
  }

  return [...groups.values()];
}
