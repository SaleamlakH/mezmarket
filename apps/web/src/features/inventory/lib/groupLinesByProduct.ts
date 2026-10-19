import type { StockBatchLineDetailResponse } from '@mez/types';

/** One product of a batch, together with every line that belongs to it. */
export interface ProductGroup {
  productId: string;
  productName: string;
  productBrand: string | null;
  lines: StockBatchLineDetailResponse[];
}

/**
 * Groups a batch's lines by the product they belong to, keeping the order the
 * products first appear in so the list reads the way it was recorded.
 */
export function groupLinesByProduct(lines: StockBatchLineDetailResponse[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();
  for (const line of lines) {
    const group = groups.get(line.productId) ?? {
      productId: line.productId,
      productName: line.productName,
      productBrand: line.productBrand,
      lines: [],
    };
    group.lines.push(line);
    groups.set(line.productId, group);
  }
  return [...groups.values()];
}
