import type {
  BatchRepository,
  BatchService,
  CreateBatchCommand,
  CreateBatchInput,
  CreateBatchLineInput,
  ProductContext,
  ProductInventorySummary,
  ProductUnitContext,
  ProductWithStockLinesRecord,
  ResolvedBatchLine,
  StockBatchRecord,
  StockIncrement,
  StockStatus,
} from './batches.types.js';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import type { Actor, Scope } from '../../shared/types/session.types.js';
import {
  convertToStandardQuantity,
  resolveToStandard,
  snapshotLines,
} from '../../shared/utils/snapshot.js';
import type { StockBatchLine as StockBatchLineRecord } from '../../../generated/prisma/client.js';

export function createBatchService(repository: BatchRepository): BatchService {
  return {
    async createBatch(actor: Actor, input: CreateBatchInput) {
      const productIds = [...new Set(input.lines.map((line) => line.productId))];
      const products = await repository.getProductUnitContext(actor.businessId, productIds);
      const lines = snapshotBatchLines(products, actor.businessId, input.lines);

      const command: CreateBatchCommand = {
        businessId: actor.businessId,
        branchId: actor.branchId,
        memberId: actor.memberId,
        header: {
          batchDate: input.batchDate,
          ...(input.supplierName !== undefined && { supplierName: input.supplierName }),
          ...(input.referenceNumber !== undefined && { referenceNumber: input.referenceNumber }),
        },
        lines,
        stockIncrements: sumStockByProduct(lines),
      };

      const createBatchResult = await repository.createBatchAndAdjustStock(command);
      return toBatchDetail(createBatchResult);
    },

    async listBatches({ businessId, branchId }: Scope) {
      const records = await repository.listBatches(businessId, branchId);
      return records.map(toBatchDetail);
    },

    async listProductInventorySummaries({ businessId, branchId }: Scope) {
      const records = await repository.listProductsWithStockLines(businessId, branchId);

      if (records.length === 0) return [];

      const attachments = await repository.listProductAttachments(
        records.map((record) => record.id),
      );

      const uploadIds = new Map(
        attachments
          .filter((attachment) => attachment.uploadId != null)
          .map((attachment) => [attachment.recordId, attachment.uploadId]),
      );

      return records.map((record) => toProductInventorySummary(record, uploadIds));
    },
  };
}

/**
 * The batch snapshot: the shared catalog walk bound to the batch line resolver.
 */
function snapshotBatchLines(
  products: ProductContext[],
  businessId: string,
  lines: CreateBatchInput['lines'],
): ResolvedBatchLine[] {
  return snapshotLines(products, businessId, lines, snapshotBatchLine);
}

/**
 * The batch-only part of a line: the purchasable unit it was bought in and the
 * stock it adds. The catalog walk lives in `snapshotLines` and the standard-unit
 * math in `resolveToStandard`/`convertToStandardQuantity`, both shared with the
 * sale snapshot.
 */
function snapshotBatchLine(product: ProductContext, line: CreateBatchLineInput): ResolvedBatchLine {
  const unit = requirePurchasableUnit(line, product);
  const standard = resolveToStandard(line.purchaseQuantity, unit, product.productUnits);
  const stockIncrement = convertToStandardQuantity(
    product.productUnits,
    unit,
    'BASE',
    line.purchaseQuantity,
  );

  return {
    productId: product.id,
    productUnitId: unit.id,
    purchaseUnit: unit.name,
    purchaseQuantity: line.purchaseQuantity,
    purchaseUnitCost: line.purchaseUnitCost,
    standardUnit: standard.symbol,
    standardQuantity: standard.quantity,
    resolvedStandardUnitId: standard.id,
    expiryDate: line.expiryDate ?? null,
    stockIncrement,
  };
}

function requirePurchasableUnit(line: CreateBatchLineInput, product: ProductContext) {
  const unit = product.productUnits.find((candidate) => candidate.id === line.productUnitId);

  if (!unit) {
    throw new AppError(
      ERROR_CODES.BAD_REQUEST,
      'The selected unit does not belong to this product',
      400,
    );
  }

  if (!unit.purchaseCapable) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'The selected unit cannot be purchased', 400);
  }

  return unit;
}

/** Sealed stock is counted per product, so lines of one product are summed. */
function sumStockByProduct(lines: ResolvedBatchLine[]): StockIncrement[] {
  const totals = new Map<string, number>();

  for (const line of lines) {
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.stockIncrement);
  }

  return [...totals].map(([productId, amount]) => ({ productId, amount }));
}

/** Stored decimals narrowed to numbers, and the product label flattened onto each line. */
function toBatchDetail(record: StockBatchRecord) {
  const { lines, receivedByMember, ...batch } = record;

  return {
    ...batch,
    lines: lines.map(
      ({
        product,
        purchaseQuantity,
        purchaseUnitCost,
        standardQuantity,
        quantityRemaining,
        ...line
      }) => ({
        ...line,
        purchaseQuantity: purchaseQuantity.toNumber(),
        purchaseUnitCost: purchaseUnitCost.toNumber(),
        standardQuantity: standardQuantity.toNumber(),
        quantityRemaining: quantityRemaining.toNumber(),
        productName: product.name,
        productBrand: product.brand,
      }),
    ),
    receivedBy: receivedByMember,
  };
}

function toProductInventorySummary(
  record: ProductWithStockLinesRecord,
  uploadIds: Map<string, string>,
): ProductInventorySummary {
  const baseUnit = record.productUnits.find((unit) => unit.unitRole === 'BASE');

  // Without a Base Unit there is no unit to express the stock in.
  if (!baseUnit) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, `Product ${record.name} has no base unit`, 500);
  }

  const currentSealedStock = record.currentSealedStock.toNumber();
  const lowStockThreshold = record.lowStockThreshold?.toNumber() ?? null;
  const totals = sumInventoryTotals(record);

  return {
    id: record.id,
    name: record.name,
    brand: record.brand,
    currentSealedStock,
    lowStockThreshold,
    active: record.active,
    baseUnitLabel: baseUnit.name,
    uploadId: uploadIds.get(record.id) ?? null,
    totalCost: totals.totalCost,
    earliestExpiry: totals.earliestExpiry,
    expiryCount: totals.expiringBatchIds.size,
    numberOfBatches: totals.batchIds.size,
    stockStatus: stockStatusOf(currentSealedStock, lowStockThreshold),
  };
}

/** A product with no threshold set has no level to be low against. */
function stockStatusOf(currentSealedStock: number, lowStockThreshold: number | null): StockStatus {
  if (currentSealedStock <= 0) return 'OUT_OF_STOCK';
  if (lowStockThreshold !== null && currentSealedStock < lowStockThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

type InventoryTotals = {
  totalCost: number;
  earliestExpiry: Date | null;
  expiringBatchIds: Set<string>;
  batchIds: Set<string>;
};

function sumInventoryTotals(record: ProductWithStockLinesRecord): InventoryTotals {
  const totals: InventoryTotals = {
    totalCost: 0,
    earliestExpiry: null,
    expiringBatchIds: new Set(),
    batchIds: new Set(),
  };

  for (const line of record.stockBatchLines) {
    totals.totalCost += remainingCostOf(line, record.productUnits);
    totals.batchIds.add(line.stockBatchId); // if only has remaining > 0, needs correction

    if (line.expiryDate === null) continue;

    totals.expiringBatchIds.add(line.stockBatchId);
    if (totals.earliestExpiry === null || line.expiryDate < totals.earliestExpiry) {
      totals.earliestExpiry = line.expiryDate;
    }
  }

  return totals;
}

/**
 * What a line cost when bought, scaled by the fraction of it still unsold. The
 * fraction is taken against the base-unit quantity because remaining quantity is
 * tracked in base units. A line whose purchased unit is missing from the
 * product's units contributes no cost, so the rest of the summary still adds up.
 */
function remainingCostOf(line: StockBatchLineRecord, productUnits: ProductUnitContext[]): number {
  const sourceUnit = productUnits.find((unit) => unit.id === line.productUnitId);

  if (!sourceUnit) return 0;

  const baseBought = convertToStandardQuantity(
    productUnits,
    sourceUnit,
    'BASE',
    line.purchaseQuantity.toNumber(),
  );

  if (baseBought === 0) return 0;

  const bought = line.purchaseQuantity.toNumber() * line.purchaseUnitCost.toNumber();
  return bought * (line.quantityRemaining.toNumber() / baseBought);
}
