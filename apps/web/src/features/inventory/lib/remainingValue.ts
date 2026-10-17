import type { ProductInventoryBatchLineResponse } from '@mez/types';

/**
 * What is still on hand from one line, in money. The line cost is
 * `purchaseQuantity × purchaseUnitCost`, scaled by the fraction of the
 * standard quantity still unsold — the remaining quantity is tracked in the
 * standard unit, so the two share a base. A line with no standard quantity
 * contributes nothing rather than dividing by zero.
 */
export function remainingValueOf(line: ProductInventoryBatchLineResponse): number {
  if (line.standardQuantity <= 0) return 0;
  const fraction = line.quantityRemaining / line.standardQuantity;
  return line.purchaseQuantity * line.purchaseUnitCost * fraction;
}
