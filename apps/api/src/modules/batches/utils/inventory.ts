import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import { roundQuantity } from '../../../shared/utils/rounding.js';
import { sumInventoryTotals } from './totals.js';
import type {
  ProductInventoryExpiry,
  ProductInventoryExpiryGroup,
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
  asOf: Date,
  expiryBefore: Date,
): ProductInventorySummary {
  return buildProductInventorySummary(
    record,
    record.stockBatchLines,
    uploadIds.get(record.id) ?? null,
    asOf,
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
 * The stock header plus the expiry groups the list and detail show. Both read
 * the lines still holding stock, so the two surfaces describe the same stock.
 */
export function buildProductInventorySummary(
  record: ProductWithStockLinesRecord,
  lines: StockBatchLineRecord[],
  uploadId: string | null,
  asOf: Date,
  expiryBefore: Date,
): ProductInventorySummary {
  return {
    ...buildProductInventoryStock(record, lines, uploadId),
    expiry: expiryBreakdownOf(lines, asOf, expiryBefore),
  };
}

type ExpiryGroupAccumulator = {
  lotCount: number;
  quantity: number;
  earliest: Date | null;
};

function addExpiryToGroup(group: ExpiryGroupAccumulator, line: StockBatchLineRecord): void {
  group.lotCount += 1;
  group.quantity += line.quantityRemaining.toNumber();

  if (line.expiryDate !== null) {
    if (group.earliest === null || line.expiryDate < group.earliest) {
      group.earliest = line.expiryDate;
    }
  }
}

function expiryGroupOf(group: ExpiryGroupAccumulator): ProductInventoryExpiryGroup {
  return {
    lotCount: group.lotCount,
    quantity: roundQuantity(group.quantity),
    earliestExpiryDate: group.earliest?.toISOString() ?? null,
  };
}

/**
 * Splits the remaining stock into lots already past their expiry and lots
 * expiring by the display cutoff. The groups are disjoint: a lot expiring at
 * the request instant is `soon`, not `expired`. Lines are expected to hold
 * remaining stock only.
 */
export function expiryBreakdownOf(
  lines: StockBatchLineRecord[] | StockBatchLineWithBatchRecord[],
  asOf: Date,
  expiryBefore: Date,
): ProductInventoryExpiry {
  const expired: ExpiryGroupAccumulator = { lotCount: 0, quantity: 0, earliest: null };
  const soon: ExpiryGroupAccumulator = { lotCount: 0, quantity: 0, earliest: null };

  for (const line of lines) {
    if (line.expiryDate === null) continue;

    if (line.expiryDate < asOf) {
      addExpiryToGroup(expired, line);
    } else if (line.expiryDate <= expiryBefore) {
      addExpiryToGroup(soon, line);
    }
  }

  return { expired: expiryGroupOf(expired), soon: expiryGroupOf(soon) };
}

/** A product with no threshold set has no level to be low against. */
export function stockStatusOf(
  currentSealedStock: number,
  lowStockThreshold: number | null,
): StockStatus {
  if (currentSealedStock <= 0) return 'OUT_OF_STOCK';
  if (lowStockThreshold !== null && currentSealedStock <= lowStockThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}
