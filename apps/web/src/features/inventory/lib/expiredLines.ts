import type { StockBatchLineDetailResponse } from '@mez/types';

/**
 * Whether a line had already expired by the day its batch was received. The
 * comparison is against the batch's own date, not today, so a batch is always
 * judged by the same moment no matter when it is read.
 */
export function isLineExpired(
  line: Pick<StockBatchLineDetailResponse, 'expiryDate'>,
  batchDate: string,
): boolean {
  if (!line.expiryDate) return false;
  return new Date(line.expiryDate).getTime() <= new Date(batchDate).getTime();
}

/** How many of a batch's lines had expired by the day it was received. */
export function expiredLineCount(
  lines: readonly Pick<StockBatchLineDetailResponse, 'expiryDate'>[],
  batchDate: string,
): number {
  return lines.filter((line) => isLineExpired(line, batchDate)).length;
}
