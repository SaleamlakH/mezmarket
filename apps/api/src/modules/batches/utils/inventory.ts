import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import { roundQuantity } from '../../../shared/utils/rounding.js';
import { sumInventoryTotals } from './totals.js';
import type {
  ProductInventoryExpiry,
  ProductInventoryStock,
  ProductInventorySummary,
  ProductUnitContext,
  ProductWithBatchHistoryRecord,
  ProductWithStockLinesRecord,
  StockBatchLineWithBatchRecord,
  StockStatus,
} from '../batches.types.js';
import type { StockBatchLine as StockBatchLineRecord } from '../../../../generated/prisma/client.js';

export function toProductInventorySummary(
  record: ProductWithStockLinesRecord,
  uploadIds: Map<string, string>,
  expiryBefore: Date,
): ProductInventorySummary {
  return buildProductInventorySummary(
    record,
    record.stockBatchLines,
    uploadIds.get(record.id) ?? null,
    expiryBefore,
  );
}

/** The product's Base Unit, the unit every stock figure is expressed in. */
export function baseUnitOf(
  record: ProductWithBatchHistoryRecord | ProductWithStockLinesRecord,
): ProductUnitContext {
  const baseUnit = record.productUnits.find((unit) => unit.unitRole === 'BASE');

  // Without a Base Unit there is no unit to express the stock in.
  if (!baseUnit) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, `Product ${record.name} has no base unit`, 500);
  }

  return baseUnit;
}

/**
 * The stock header a product shares between the list and the detail. The list
 * passes the lines still holding stock; the detail passes the same subset, so
 * both surfaces agree on the totals.
 */
export function buildProductInventoryStock(
  record: ProductWithBatchHistoryRecord | ProductWithStockLinesRecord,
  lines: StockBatchLineWithBatchRecord[] | StockBatchLineRecord[],
  uploadId: string | null,
): ProductInventoryStock {
  const baseUnit = baseUnitOf(record);
  const currentSealedStock = record.currentSealedStock.toNumber();
  const lowStockThreshold = record.lowStockThreshold?.toNumber() ?? null;
  const totals = sumInventoryTotals(lines, record.productUnits);

  return {
    id: record.id,
    name: record.name,
    brand: record.brand,
    currentSealedStock,
    lowStockThreshold,
    active: record.active,
    baseUnitLabel: baseUnit.name,
    uploadId,
    totalCost: totals.totalCost,
    numberOfBatches: totals.batchIds.size,
    stockStatus: stockStatusOf(currentSealedStock, lowStockThreshold),
  };
}

/**
 * The stock header plus the expiry figures the list shows. Both read the lines
 * still holding stock, so the list and the detail describe the same stock.
 */
export function buildProductInventorySummary(
  record: ProductWithStockLinesRecord,
  lines: StockBatchLineRecord[],
  uploadId: string | null,
  expiryBefore: Date,
): ProductInventorySummary {
  return {
    ...buildProductInventoryStock(record, lines, uploadId),
    expiry: expiryTotalsOf(lines, expiryBefore),
  };
}

/**
 * The lots still holding stock that expire before the cutoff, and how much is
 * on them in base units. The cutoff is the caller's, so a caller can ask for
 * what is already expired or what will expire by a chosen date.
 */
export function expiryTotalsOf(
  lines: StockBatchLineRecord[] | StockBatchLineWithBatchRecord[],
  expiryBefore: Date,
): ProductInventoryExpiry {
  let lotCount = 0;
  let quantity = 0;

  for (const line of lines) {
    if (line.quantityRemaining.toNumber() <= 0) continue;
    if (line.expiryDate === null || line.expiryDate > expiryBefore) continue;

    lotCount += 1;
    quantity += line.quantityRemaining.toNumber();
  }

  return { lotCount, quantity: roundQuantity(quantity) };
}

/** A product with no threshold set has no level to be low against. */
export function stockStatusOf(
  currentSealedStock: number,
  lowStockThreshold: number | null,
): StockStatus {
  if (currentSealedStock <= 0) return 'OUT_OF_STOCK';
  if (lowStockThreshold !== null && currentSealedStock < lowStockThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}
