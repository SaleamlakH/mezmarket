import type { CreateSaleInput, PaymentMethod, PaymentStatus } from '@mez/types';
import type { ResolvedPayment } from '../sales.types.js';

/**
 * The amount a recorded payment settles, or `null` when the status records no
 * payment at all.
 *
 * A `PAID` payment that names no amount settles `fallback` — the outstanding
 * balance when recording against an existing sale, the whole total when a sale
 * is confirmed as paid at creation. A partial payment always names its amount,
 * so `fallback` never stands in for it.
 */
export function amountToRecord(
  status: PaymentStatus,
  amount: number | undefined,
  fallback: number,
): number | null {
  if (status === 'PENDING') return null;
  return amount ?? fallback;
}

/**
 * What a sale owes once its payments total `amountPaid`. The balance is floored
 * at zero, so an overpayment never shows as a negative amount due; the status
 * is whatever the caller asserted, which is why a sale can read Paid with a
 * remaining balance when it was settled short.
 */
export function paymentSummary(
  total: number,
  amountPaid: number,
): { amountPaid: number; balanceDue: number } {
  return { amountPaid, balanceDue: Math.max(total - amountPaid, 0) };
}

/**
 * The sale's opening payment position. A sale with no initial payment opens
 * pending and owing the full total; one that names a status opens at that
 * status with the totals that status implies — a paid sale with no amount is
 * settled whole, a partial one keeps a balance.
 */
export function resolveInitialPayment(
  payment: CreateSaleInput['initialPayment'],
  total: number,
): {
  status: PaymentStatus;
  amountPaid: number;
  balanceDue: number;
  payment: ResolvedPayment | null;
} {
  if (!payment) {
    return { status: 'PENDING', amountPaid: 0, balanceDue: total, payment: null };
  }

  const amount = amountToRecord(payment.status, payment.amount, total);
  const { amountPaid, balanceDue } = paymentSummary(total, amount ?? 0);

  return {
    status: payment.status,
    amountPaid,
    balanceDue,
    payment: amount === null ? null : toResolvedPayment(payment, amount),
  };
}

/** A caller's payment narrowed to the row that gets written, method defaulted. */
export function toResolvedPayment(
  input: { method?: PaymentMethod; methodDetail?: string },
  amount: number,
): ResolvedPayment {
  return {
    amount,
    method: input.method ?? 'OTHER',
    methodDetail: input.methodDetail?.length ? input.methodDetail : null,
  };
}
