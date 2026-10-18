import type { ProductInventoryBatchLineResponse } from '@mez/types';

/** Which side of "now" a line's expiry falls, and how urgent it is. */
export type ExpiryState = 'expired' | 'soon' | 'later' | 'none';

/** How close an expiry has to be before it is counted as expiring soon. */
export const EXPIRY_SOON_HORIZON_DAYS = 7;

const DAY_MS = 1000 * 60 * 60 * 24;

/** How many whole days the expiry is past `now` (negative when still ahead). */
export function daysSince(expiryDate: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(expiryDate).getTime()) / DAY_MS);
}

/**
 * Classifies an expiry against `now`: already past, within the soon horizon,
 * further out, or absent. `now` is passed in so callers and tests agree on the
 * same moment.
 */
export function expiryState(
  line: Pick<ProductInventoryBatchLineResponse, 'expiryDate'>,
  now: Date,
): ExpiryState {
  if (!line.expiryDate) return 'none';

  const expiry = new Date(line.expiryDate).getTime();
  if (expiry <= now.getTime()) return 'expired';
  if (expiry <= now.getTime() + EXPIRY_SOON_HORIZON_DAYS * DAY_MS) return 'soon';
  return 'later';
}

/**
 * How many lots still holding stock expire within the soon horizon. Counted by
 * line, so the number reads as "how many lots to move", not how much stock.
 */
export function expiringSoonLineCount(
  lines: readonly Pick<ProductInventoryBatchLineResponse, 'quantityRemaining' | 'expiryDate'>[],
  now: Date,
): number {
  return lines.filter((line) => line.quantityRemaining > 0 && expiryState(line, now) === 'soon')
    .length;
}

/** The last moment a lot may expire and still count as expiring soon. */
export function expiryCutoff(now: Date): Date {
  return new Date(now.getTime() + EXPIRY_SOON_HORIZON_DAYS * DAY_MS);
}

export interface ExpiryAlertTotals {
  /** Standard-unit quantity already expired. */
  expiredQuantity: number;
  /** Standard-unit quantity expiring within the soon horizon. */
  soonQuantity: number;
}

/**
 * Adds up the stock still on hand that is expired and that expires within the
 * soon horizon, in the product's standard unit. A line with nothing remaining
 * adds nothing, so the totals speak only to stock that is actually there. An
 * all-clear is two zeroes, which the caller reads as "no alert".
 */
export function expiryAlertTotals(
  lines: readonly Pick<ProductInventoryBatchLineResponse, 'quantityRemaining' | 'expiryDate'>[],
  now: Date,
): ExpiryAlertTotals {
  let expiredQuantity = 0;
  let soonQuantity = 0;

  for (const line of lines) {
    if (line.quantityRemaining <= 0) continue;

    const state = expiryState(line, now);
    if (state === 'expired') expiredQuantity += line.quantityRemaining;
    else if (state === 'soon') soonQuantity += line.quantityRemaining;
  }

  return { expiredQuantity, soonQuantity };
}
