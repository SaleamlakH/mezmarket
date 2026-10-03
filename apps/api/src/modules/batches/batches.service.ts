import type {
  BatchActor,
  BatchListResult,
  BatchRepository,
  BatchScope,
  BatchService,
  CreateBatchCommand,
  CreateBatchInput,
  CreateBatchLineInput,
  CreateBatchResult,
  ProductContext,
  ProductUnitContext,
  ResolvedBatchLine,
  StockBatchRecord,
  StockIncrement,
} from './batches.types.js';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import type { UnitDependsOn } from '../../../generated/prisma/enums.js';

export function createBatchService(repository: BatchRepository): BatchService {
  return {
    async createBatch(actor: BatchActor, input: CreateBatchInput): Promise<CreateBatchResult> {
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

    async listBatches({ businessId, branchId }: BatchScope): Promise<BatchListResult> {
      const records = await repository.listBatches(businessId, branchId);
      return records.map(toBatchDetail);
    },
  };
}

/**
 * Reads the catalog of the products a batch names and checks every line
 * against it, so a line can never write stock for a product the business does
 * not have, bought in a unit that product does not have, or bought in a unit
 * that cannot be purchased.
 */
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
 * The standard unit a purchase is snapshotted in, and the quantity expressed in
 * it. BASE, MOU and STANDARD rows each carry the standard unit they are sold in,
 * so a purchase in one of them snapshots as itself — the quantity never moves.
 * A CUSTOM row carries no standard unit of its own, so it is resolved through
 * the role it depends on.
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

  // A CUSTOM row is the only one allowed to carry no standard unit of its own.
  // Any other role missing one is a broken catalog, never something to walk
  // through a dependency, so it must not be allowed to resolve to something else.
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

  if (unit.unitRole === 'BASE') {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, `Base unit cannot become ${targetRole}`, 500);
  }

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

  // An MOU's rate is its Pack Relation (1 BU = X MOU), so its hop divides. A
  // STANDARD or CUSTOM rate is how many dependsOn units one of it holds
  // (1 L = 1000 ml, 1 shot = 25 ml), so the same column's hop multiplies.
  const convertedQuantity =
    unit.unitRole === 'MOU'
      ? quantity / unit.conversionRate.toNumber()
      : quantity * unit.conversionRate.toNumber();

  // direct converstion to the unit they depend on
  if (unit.dependsOn === targetRole) return convertedQuantity;

  // depends on mou, but conversion target is base
  if (unit.dependsOn === 'MOU') {
    const mou = productUnits.find((target) => target.unitRole === unit.dependsOn);

    if (!mou?.conversionRate) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        `The product has no conversion rate on its ${unit.dependsOn} unit`,
        500,
      );
    }

    return convertedQuantity / mou.conversionRate.toNumber();
  }

  throw new AppError(
    ERROR_CODES.INTERNAL_ERROR,
    `Cannot convert ${unit.unitRole} to ${targetRole}`,
    500,
  );
}

/** Sealed stock is counted per product, so lines of one product are summed. */
function sumStockByProduct(lines: ResolvedBatchLine[]): StockIncrement[] {
  const totals = new Map<string, number>();

  for (const line of lines) {
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.stockIncrement);
  }

  return [...totals].map(([productId, amount]) => ({ productId, amount }));
}

/**
 * The stored record as a read hands it back: stored decimals narrowed to the
 * numbers the columns keep, the product label each line belongs to flattened
 * onto the line itself, and the receiver under the name the response contract
 * gives it rather than the relation's.
 */
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
