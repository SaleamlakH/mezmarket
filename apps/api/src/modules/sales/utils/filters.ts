import type { SaleListFilters } from '@mez/types';
import type { SaleListQuery } from '../sales.types.js';

/** How old an unpaid sale must be before an overdue read includes it. */
const OVERDUE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** Resolves the request filters into the terms a sale-history read takes. */
export function toSaleListQuery(filters: SaleListFilters, now: Date): SaleListQuery {
  const overdue = filters.overdue === true;
  const to = filters.to !== undefined ? new Date(filters.to) : undefined;
  // Keep the old exclusive cutoff while the read takes an inclusive upper bound.
  const cutoff = new Date(now.getTime() - OVERDUE_AFTER_MS - 1);
  const upper = overdue ? new Date(Math.min(cutoff.getTime(), to?.getTime() ?? Infinity)) : to;

  return {
    ...(filters.status?.length ? { status: filters.status } : {}),
    ...(filters.from && !overdue && { from: new Date(filters.from) }),
    ...(upper && { to: upper }),
    ...(filters.productId && { productId: filters.productId }),
    ...(filters.paymentFrom && { paymentFrom: new Date(filters.paymentFrom) }),
    ...(filters.paymentTo && { paymentTo: new Date(filters.paymentTo) }),
    ...((filters.unpaid === true || overdue) && { unpaid: true }),
  };
}
