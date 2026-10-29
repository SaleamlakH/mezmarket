import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import type {
  ProductSellContext,
  ResolvedSaleLine,
  SaleLineAllocation,
  StockDecrement,
  StockLot,
  StockLotDecrement,
} from '../sales.types.js';
import { roundQuantity } from '../../../shared/utils/rounding.js';

/**
 * Draws every line against the lots of its product, preferring the oldest lot
 * that can cover the line and splitting only when none can. The negative-stock
 * rule is applied before anything is drawn, so a blocked sale is rejected whole.
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
 * The products that would be taken below zero by the sale's draws, keyed by
 * product id. The draw is summed per product, because several lines may each be
 * individually fine but together oversell it.
 */
export function collectStockErrors(
  products: ProductSellContext[],
  lines: Array<Pick<ResolvedSaleLine, 'productId' | 'quantityInBaseUnit'>>,
): Record<string, string> {
  const details: Record<string, string> = {};

  for (const { productId, amount } of sumBaseByProduct(lines)) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) continue;

    if (product.currentSealedStock.toNumber() - amount < 0) {
      details[productId] = 'Out of stock';
    }
  }

  return details;
}

/**
 * Rejects the whole sale when it would take any product's sealed stock below
 * zero and the business does not allow it. Every offending product is reported
 * once, under the field path of its first line, matching the validation errors
 * the client already handles.
 */
export function enforceStockPolicy(
  products: ProductSellContext[],
  lines: ResolvedSaleLine[],
  allowNegativeStock: boolean,
): void {
  if (allowNegativeStock) return;

  const stockErrors = collectStockErrors(products, lines);
  const details: Record<string, string> = {};
  const reported = new Set<string>();

  lines.forEach((line, index) => {
    const message = stockErrors[line.productId];
    if (message && !reported.has(line.productId)) {
      details[`lines.${index}.productId`] = message;
      reported.add(line.productId);
    }
  });

  if (Object.keys(details).length > 0) {
    throw new AppError(
      ERROR_CODES.BAD_REQUEST,
      'The sale would take stock below zero',
      400,
      details,
    );
  }
}

/**
 * Allocates one line's base quantity against its product's lots. The oldest lot
 * that can cover the whole line is drawn first, so a small fractional remnant is
 * left for a smaller sale instead of being consumed in pieces. Only when no
 * single lot can cover the line does it split across the oldest lots.
 */
export function drawLine(
  line: ResolvedSaleLine,
  lots: StockLot[],
  remaining: Map<string, number>,
): SaleLineAllocation[] {
  const allocations: SaleLineAllocation[] = [];
  let toDraw = roundQuantity(line.quantityInBaseUnit);

  if (toDraw <= 0) return allocations;

  const availableIn = (lot: StockLot) => roundQuantity(remaining.get(lot.id) ?? 0);
  const draw = (lot: StockLot, quantity: number) => {
    remaining.set(lot.id, roundQuantity(availableIn(lot) - quantity));
    allocations.push({
      stockBatchLineId: lot.id,
      quantityPulled: quantity,
      unitCost: lot.purchaseUnitCost.toNumber(),
    });
  };

  // The oldest lot that can cover the line on its own keeps a fractional
  // remnant for a smaller sale instead of consuming it in pieces.
  const covering = lots.find((lot) => availableIn(lot) >= toDraw);

  if (covering) {
    draw(covering, toDraw);
    return allocations;
  }

  // No single lot had enough: split across the oldest lots as before.
  for (const lot of lots) {
    if (toDraw <= 0) break;

    const available = availableIn(lot);
    if (available <= 0) continue;

    const pulled = roundQuantity(Math.min(available, toDraw));
    draw(lot, pulled);
    toDraw = roundQuantity(toDraw - pulled);
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
export function sumBaseByProduct(
  lines: Array<Pick<ResolvedSaleLine, 'productId' | 'quantityInBaseUnit'>>,
): StockDecrement[] {
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
