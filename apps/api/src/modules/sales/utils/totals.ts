import type { ResolvedSaleLine } from '../sales.types.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import { roundMoney } from './rounding.js';

/**
 * The sale's money totals from its resolved lines, the tax rate applied and an
 * optional whole-sale discount: the subtotal is the sum of the lines, the
 * discount is taken off it, the tax is what is left at the rate, and the total
 * is the discounted amount plus that tax. Each step is rounded to the precision
 * the columns store, so no total carries a fraction the database cannot hold.
 *
 * A discount larger than the subtotal is refused rather than swallowed: the
 * caller told us to take off more than the goods are worth, which is a mistake
 * worth surfacing, not silently turning into a free sale.
 */
export function computeSaleTotals(
  lines: ResolvedSaleLine[],
  taxRate: number,
  discount: number | undefined = undefined,
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  const discountAmount = discount ?? 0;

  if (discountAmount > subtotal) {
    throw new AppError(
      ERROR_CODES.BAD_REQUEST,
      'The discount cannot be greater than the sale subtotal',
      400,
      {
        discount: 'The discount cannot be greater than the sale subtotal',
      },
    );
  }

  const taxable = roundMoney(subtotal - discountAmount);
  const taxAmount = roundMoney(taxable * taxRate);
  const total = roundMoney(taxable + taxAmount);

  return { subtotal, taxAmount, total };
}
