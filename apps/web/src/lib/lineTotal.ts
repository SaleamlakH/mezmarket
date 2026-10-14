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

/**
 * One line's amount where the quantity is already a number — the typed form
 * uses `lineTotal`; the draft store holds a parsed quantity. Null when the unit
 * has no price, so a line without a price never counts as zero.
 */
export function lineAmount(quantity: number, unitPrice: number | null): number | null {
  return unitPrice === null ? null : quantity * unitPrice;
}
