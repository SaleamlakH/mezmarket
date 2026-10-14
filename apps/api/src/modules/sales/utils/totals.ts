import type { ResolvedSaleLine } from '../sales.types.js';
import { roundMoney } from './rounding.js';

/**
 * The sale's money totals from its resolved lines and the tax rate applied:
 * the subtotal is the sum of the lines, the tax is that subtotal at the rate,
 * and the total is the two together. Each step is rounded to the precision the
 * columns store, so no total carries a fraction the database cannot hold.
 */
export function computeSaleTotals(
  lines: ResolvedSaleLine[],
  taxRate: number,
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  const taxAmount = roundMoney(subtotal * taxRate);
  const total = roundMoney(subtotal + taxAmount);

  return { subtotal, taxAmount, total };
}
