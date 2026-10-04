import type {
  BatchActor,
  BatchRepository,
  BatchScope,
  BatchService,
  CreateBatchCommand,
  CreateBatchInput,
  CreateBatchLineInput,
  ProductContext,
  ProductInventorySummary,
  ProductInventoryRecord,
  ProductUnitContext,
  ResolvedBatchLine,
  StockBatchRecord,
  StockIncrement,
  StockStatus,
} from './batches.types.js';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import type { UnitDependsOn } from '../../../generated/prisma/enums.js';
import type { StockBatchLine as StockBatchLineRecord } from '../../../generated/prisma/client.js';

export function createBatchService(repository: BatchRepository): BatchService {
  return {
    async createBatch(actor: BatchActor, input: CreateBatchInput) {
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

    async listBatches({ businessId, branchId }: BatchScope) {
      const records = await repository.listBatches(businessId, branchId);
      return records.map(toBatchDetail);
    },

    async listProductInventorySummaries({ businessId, branchId }: BatchScope) {
      const records = await repository.listProductInventorySummaries(businessId, branchId);
      return records.map(toProductInventorySummary);
    },
  };
}

/** Checks every line against the product catalog before it writes any stock. */
function snapshotBatchLines(
  products: ProductContext[],
  businessId: string,
  lines: CreateBatchInput['lines'],
): ResolvedBatchLine[] {
  const catalog = new Map(
    products.filter((product) => product.businessId === businessId).map((p) => [p.id, p]),
  );

  return lines.map((line) => {
    const product = catalog.get(line.productId);

    if (!product) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404);
    }

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
  });
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

/**
 * The standard unit a purchase is snapshotted in, and the quantity in it. Rows
 * carrying their own standard unit snapshotted as themselves; a CUSTOM row is
 * resolved through the role it depends on.
 */
function resolveToStandard(
  purchaseQuantity: number,
  unit: ProductUnitContext,
  productUnits: ProductUnitContext[],
): { id: string; symbol: string; quantity: number } {
  if (unit.standardUnit) {
    return {
      quantity: purchaseQuantity,
      id: unit.standardUnit.id,
      symbol: unit.standardUnit.symbol,
    };
  }

  // Only a CUSTOM row may lack a standard unit; any other role missing one is a
  // broken catalog and must not be resolved to something else.
  if (unit.unitRole !== 'CUSTOM') {
    throw new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      `The ${unit.unitRole} unit ${unit.name} has no linked standard unit`,
      500,
    );
  }

  const resolvedUnit = productUnits.find((target) => target.unitRole === unit.dependsOn);

  if (!resolvedUnit) {
    throw new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      `The product has no ${unit.dependsOn} unit for the custom unit ${unit.name}`,
      500,
    );
  }

  if (!resolvedUnit.standardUnit) {
    throw new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      `The ${resolvedUnit.unitRole} unit has no linked standard unit`,
      500,
    );
  }

  return {
    quantity: convertToStandardQuantity(
      productUnits,
      unit,
      unit.dependsOn || 'BASE',
      purchaseQuantity,
    ),
    id: resolvedUnit.standardUnit.id,
    symbol: resolvedUnit.standardUnit.symbol,
  };
}

function convertToStandardQuantity(
  productUnits: ProductUnitContext[],
  unit: ProductUnitContext,
  targetRole: UnitDependsOn,
  quantity: number,
) {
  // one to one conversion
  if (unit.unitRole === targetRole) return quantity;

  if (!unit.conversionRate) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, `Unit ${unit.name} has no conversion rate`, 500);
  }

  if (!unit.dependsOn) {
    throw new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      `Unit ${unit.name} is not linked to a ${targetRole} unit to convert through`,
      500,
    );
  }

  // An MOU rate is a pack relation (1 BU = X MOU) so it divides; a STANDARD or
  // CUSTOM rate is how many dependsOn units one of it holds, so it multiplies.
  const convertedQuantity =
    unit.unitRole === 'MOU'
      ? quantity / unit.conversionRate.toNumber()
      : quantity * unit.conversionRate.toNumber();

  if (unit.dependsOn === targetRole) return convertedQuantity;

  // `dependsOn` and `targetRole` are both BASE or MOU, so the only unequal pair
  // left is an MOU that must hop once more down to BASE.
  const mou = productUnits.find((target) => target.unitRole === 'MOU');

  if (!mou?.conversionRate) {
    throw new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      `The product has no conversion rate on its MOU unit`,
      500,
    );
  }

  return convertedQuantity / mou.conversionRate.toNumber();
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

function toProductInventorySummary(record: ProductInventoryRecord): ProductInventorySummary {
  const baseUnit = record.productUnits[0];

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

function sumInventoryTotals(record: ProductInventoryRecord): InventoryTotals {
  const totals: InventoryTotals = {
    totalCost: 0,
    earliestExpiry: null,
    expiringBatchIds: new Set(),
    batchIds: new Set(),
  };

  for (const line of record.stockBatchLines) {
    totals.totalCost += remainingCostOf(line);
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
 * fraction is taken against `standardQuantity` because remaining quantity is
 * tracked in standard units; a zero standard quantity contributes no cost.
 */
function remainingCostOf(line: StockBatchLineRecord): number {
  const standardQuantity = line.standardQuantity.toNumber();
  if (standardQuantity === 0) return 0;

  const bought = line.purchaseQuantity.toNumber() * line.purchaseUnitCost.toNumber();
  return bought * (line.quantityRemaining.toNumber() / standardQuantity);
}
