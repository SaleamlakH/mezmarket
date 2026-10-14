import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import type {
  ProductSellContext,
  ResolvedSaleLine,
  SaleLineAllocation,
  StockDecrement,
  StockLot,
  StockLotDecrement,
} from '../sales.types.js';
import { roundQuantity } from './rounding.js';

/**
 * Draws every line against the lots of its product, oldest first, splitting a
 * line across lots when the oldest runs out. The negative-stock rule is applied
 * before anything is drawn, so a blocked sale is rejected whole.
 */
export function allocateStock(
  products: ProductSellContext[],
  lots: StockLot[],
  lines: ResolvedSaleLine[],
  allowNegativeStock: boolean,
): ResolvedSaleLine[] {
  enforceStockPolicy(products, lines, allowNegativeStock);

  const lotsByProduct = groupLotsByProduct(lots);
  // Remaining per lot, in base units, drawn down as the lines are allocated.
  const remaining = new Map(lots.map((lot) => [lot.id, lot.quantityRemaining.toNumber()]));

  return lines.map((line) => ({
    ...line,
    allocations: drawLine(line, lotsByProduct.get(line.productId) ?? [], remaining),
  }));
}

/**
 * Rejects the whole sale when it would take a product's sealed stock below zero
 * and the business does not allow it. The draw is summed per product, because
 * several lines may each be individually fine but together oversell it.
 */
export function enforceStockPolicy(
  products: ProductSellContext[],
  lines: ResolvedSaleLine[],
  allowNegativeStock: boolean,
): void {
  if (allowNegativeStock) return;

  for (const { productId, amount } of sumBaseByProduct(lines)) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) continue;

    if (product.currentSealedStock.toNumber() - amount < 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, 'The sale would take stock below zero', 400, {
        productId: `Selling ${product.name} would leave less than no stock`,
      });
    }
  }
}

/** Allocates one line's base quantity against its product's lots, oldest first. */
export function drawLine(
  line: ResolvedSaleLine,
  lots: StockLot[],
  remaining: Map<string, number>,
): SaleLineAllocation[] {
  const allocations: SaleLineAllocation[] = [];
  let toDraw = line.quantityInBaseUnit;

  for (const lot of lots) {
    if (toDraw <= 0) break;

    const available = remaining.get(lot.id) ?? 0;
    if (available <= 0) continue;

    const pulled = Math.min(available, toDraw);
    remaining.set(lot.id, available - pulled);
    allocations.push({
      stockBatchLineId: lot.id,
      quantityPulled: roundQuantity(pulled),
      unitCost: lot.purchaseUnitCost.toNumber(),
    });
    toDraw -= pulled;
  }

  // Any quantity left over is an oversell with no lot behind it; the product
  // decrement still reflects it, but no cost row can be written for it.
  return allocations;
}

export function groupLotsByProduct(lots: StockLot[]): Map<string, StockLot[]> {
  const grouped = new Map<string, StockLot[]>();

  for (const lot of lots) {
    const list = grouped.get(lot.productId) ?? [];
    list.push(lot);
    grouped.set(lot.productId, list);
  }

  return grouped;
}

/** Sealed stock is counted per product, so lines of one product are summed. */
export function sumBaseByProduct(lines: ResolvedSaleLine[]): StockDecrement[] {
  const totals = new Map<string, number>();

  for (const line of lines) {
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.quantityInBaseUnit);
  }

  return [...totals].map(([productId, amount]) => ({
    productId,
    amount: roundQuantity(amount),
  }));
}

/** A lot is drawn by every line that reaches it, so its draws are summed. */
export function sumDrawsByLot(lines: ResolvedSaleLine[]): StockLotDecrement[] {
  const totals = new Map<string, number>();

  for (const line of lines) {
    for (const allocation of line.allocations) {
      totals.set(
        allocation.stockBatchLineId,
        (totals.get(allocation.stockBatchLineId) ?? 0) + allocation.quantityPulled,
      );
    }
  }

  return [...totals].map(([stockBatchLineId, quantity]) => ({
    stockBatchLineId,
    quantity: roundQuantity(quantity),
  }));
}
