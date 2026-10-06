import type { BatchLineFormValues } from '@mez/types';

/**
 * What one product line comes to: the quantity bought multiplied by what a
 * single unit of it cost.
 *
 * Null when either half is blank or unparseable, so a half-filled line reads
 * as "not known yet" instead of quietly counting as zero in a batch total.
 * Quantity and cost stay strings on the line because they are typed, not
 * yet numbers.
 */
export function lineTotal(line: BatchLineFormValues): number | null {
  if (line.purchaseQuantity.trim() === '' || line.purchaseUnitCost.trim() === '') return null;

  const quantity = Number(line.purchaseQuantity);
  const cost = Number(line.purchaseUnitCost);
  if (!Number.isFinite(quantity) || !Number.isFinite(cost)) return null;

  return quantity * cost;
}
