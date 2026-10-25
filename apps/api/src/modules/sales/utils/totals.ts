import type { ResolvedSaleLine } from '../sales.types.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import { roundMoney } from '../../../shared/utils/rounding.js';

/**
 * Return the sale's money totals from its resolved lines, the tax rate applied as a
 * percentage and an optional whole-sale discount.
 *
 * Tax is applied on the sales total and the discount difference.
 *
 * A discount larger than the subtotal is refused.
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
  const taxAmount = roundMoney(taxable * (taxRate / 100));
  const total = roundMoney(taxable + taxAmount);

  return { subtotal, taxAmount, total };
}
