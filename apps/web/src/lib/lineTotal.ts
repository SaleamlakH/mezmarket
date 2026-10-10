/**
 * One line's amount: quantity times unit price. Null when either side is blank
 * or unparseable, so a half-filled line never counts as zero. Quantity is a
 * string because it is typed, not yet a number.
 */
export function lineTotal(quantity: string, unitPrice: number | null): number | null {
  if (quantity.trim() === '' || unitPrice === null) return null;

  const qty = Number(quantity);
  if (!Number.isFinite(qty)) return null;

  return qty * unitPrice;
}
