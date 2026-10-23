import {
  conversionUnitsOf,
  quantityInBase,
  unitCostPerBase,
} from '../../../shared/utils/snapshot.js';
import { roundQuantity } from '../../../shared/utils/rounding.js';
import type { ConversionUnits } from '../../../shared/types/unit.types.js';
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
    const units = conversionUnitsOf(productUnits, line.productUnitId);
    totals.totalCost += remainingCostOf(line, units);
    totals.batchIds.add(line.stockBatchId);
  }

  return totals;
}

/** The cost still on hand from a line: remaining base units at cost per base unit. */
export function remainingCostOf(line: StockBatchLineRecord, units: ConversionUnits): number {
  const baseBought = quantityInBase(units, line.purchaseQuantity);
  const baseUnitCost = unitCostPerBase(
    line.purchaseUnitCost.toNumber(),
    baseBought,
    line.purchaseQuantity.toNumber(),
  );

  return line.quantityRemaining.toNumber() * baseUnitCost;
}

/**
 * The purchase-unit quantity still on hand from a line, scaled by the unsold
 * share of the base quantity it bought. A line whose purchased unit is missing
 * from the product's units, or which bought no base quantity, has nothing to
 * scale and reads as nothing left.
 */
export function remainingPurchaseQuantityOf(
  line: StockBatchLineRecord,
  units: ConversionUnits,
): number {
  const baseBought = quantityInBase(units, line.purchaseQuantity);

  if (baseBought === 0) return 0;

  const unsoldShare = line.quantityRemaining.toNumber() / baseBought;

  return roundQuantity(line.purchaseQuantity.toNumber() * unsoldShare);
}
