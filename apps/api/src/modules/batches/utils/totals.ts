import { convertToStandardQuantity } from '../../../shared/utils/snapshot.js';
import { roundQuantity } from '../../../shared/utils/rounding.js';
import type { ProductUnitContext, StockBatchLineWithBatchRecord } from '../batches.types.js';
import type { StockBatchLine as StockBatchLineRecord } from '../../../../generated/prisma/client.js';

type InventoryTotals = {
  totalCost: number;
  batchIds: Set<string>;
};

export function sumInventoryTotals(
  lines: StockBatchLineWithBatchRecord[] | StockBatchLineRecord[],
  productUnits: ProductUnitContext[],
): InventoryTotals {
  const totals: InventoryTotals = {
    totalCost: 0,
    batchIds: new Set(),
  };

  for (const line of lines) {
    totals.totalCost += remainingCostOf(line, productUnits);
    totals.batchIds.add(line.stockBatchId);
  }

  return totals;
}

/**
 * The share of a line still on hand, as a fraction of what it bought in base
 * units. The fraction is taken against the base-unit quantity because remaining
 * quantity is tracked in base units. A line whose purchased unit is missing from
 * the product's units, or which bought no base quantity, has nothing to scale
 * and reads as nothing left.
 */
function unsoldShareOf(line: StockBatchLineRecord, productUnits: ProductUnitContext[]): number {
  const sourceUnit = productUnits.find((unit) => unit.id === line.productUnitId);

  if (!sourceUnit) return 0;

  const purchaseQuantity = line.purchaseQuantity.toNumber();
  const baseBought = convertToStandardQuantity(productUnits, sourceUnit, 'BASE', purchaseQuantity);

  if (baseBought === 0) return 0;

  return line.quantityRemaining.toNumber() / baseBought;
}

/** The cost still on hand from a line: what it bought, scaled by the unsold share. */
export function remainingCostOf(
  line: StockBatchLineRecord,
  productUnits: ProductUnitContext[],
): number {
  const bought = line.purchaseQuantity.toNumber() * line.purchaseUnitCost.toNumber();

  return bought * unsoldShareOf(line, productUnits);
}

/** The purchase-unit quantity still on hand from a line, scaled by the unsold share. */
export function remainingPurchaseQuantityOf(
  line: StockBatchLineRecord,
  productUnits: ProductUnitContext[],
): number {
  return roundQuantity(line.purchaseQuantity.toNumber() * unsoldShareOf(line, productUnits));
}
