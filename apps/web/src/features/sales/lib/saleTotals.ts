export interface SaleTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

/** A sale's totals alongside the tax config they were computed from. */
export interface SaleTotalsPreview extends SaleTotals {
  /** The rate as a percentage, zero when tax is off. */
  taxRate: number;
  taxOnSales: boolean;
}

/**
 * The running subtotal, tax and total a sale will be created with — a preview
 * only, since the server computes and stores the real figures. The rate is a
 * percentage and is added on top of the subtotal.
 */
export function saleTotals(linesTotal: number, taxRate: number): SaleTotals {
  const taxAmount = linesTotal * (taxRate / 100);
  return { subtotal: linesTotal, taxAmount, total: linesTotal + taxAmount };
}
