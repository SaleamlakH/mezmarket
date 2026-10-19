import type { StockBatchLineDetailResponse } from '@mez/types';

/**
 * What a batch came to: every line's purchased quantity multiplied by what a
 * single unit of it cost. A batch carries no total of its own, so callers
 * derive it the same way the line detail already lets them.
 */
export function batchTotal(lines: readonly StockBatchLineDetailResponse[]): number {
  return lines.reduce((total, line) => total + line.purchaseQuantity * line.purchaseUnitCost, 0);
}
