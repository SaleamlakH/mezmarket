import type { TaxDisplayMode } from '@mez/types';

export interface SaleTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

/**
 * The running subtotal, tax and total a sale will be created with — a preview
 * only, since the server computes and stores the real figures. Tax is the
 * business's own rate, zero when unset: added on top under an exclusive
 * display, backed out of the total under an inclusive one.
 */
export function saleTotals(
  linesTotal: number,
  taxRate: number,
  taxDisplayMode: TaxDisplayMode,
): SaleTotals {
  if (taxDisplayMode === 'INCLUSIVE') {
    const subtotal = linesTotal / (1 + taxRate);
    return { subtotal, taxAmount: linesTotal - subtotal, total: linesTotal };
  }

  const taxAmount = linesTotal * taxRate;
  return { subtotal: linesTotal, taxAmount, total: linesTotal + taxAmount };
}
