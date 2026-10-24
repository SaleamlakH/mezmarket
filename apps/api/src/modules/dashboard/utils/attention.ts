import type { AttentionStock } from '@mez/types';
import type { StockPosition } from '../dashboard.types.js';

/**
 * Splits active products into out-of-stock and low-stock names, using each
 * product's own threshold. The two groups are exclusive and out-of-stock
 * names are listed first for the preview.
 */
export function toAttentionStock(products: StockPosition[]): AttentionStock {
  const outOfStock: string[] = [];
  const lowStock: string[] = [];

  for (const product of products) {
    const stock = product.currentSealedStock.toNumber();
    const threshold = product.lowStockThreshold?.toNumber() ?? null;

    if (stock <= 0) {
      outOfStock.push(product.name);
    } else if (threshold !== null && stock <= threshold) {
      lowStock.push(product.name);
    }
  }

  outOfStock.sort();
  lowStock.sort();

  return {
    count: outOfStock.length + lowStock.length,
    lowCount: lowStock.length,
    outCount: outOfStock.length,
    preview: [...outOfStock, ...lowStock].slice(0, 2),
  };
}
