import type { ResolvedBatchLine, StockIncrement } from '../batches.types.js';

/** Sealed stock is counted per product, so lines of one product are summed. */
export function sumStockByProduct(lines: ResolvedBatchLine[]): StockIncrement[] {
  const totals = new Map<string, number>();

  for (const line of lines) {
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.stockIncrement);
  }

  return [...totals].map(([productId, amount]) => ({ productId, amount }));
}
