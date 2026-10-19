import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import {
  convertToStandardQuantity,
  resolveToStandard,
  snapshotLines,
} from '../../../shared/utils/snapshot.js';
import type {
  CreateBatchInput,
  CreateBatchLineInput,
  ProductContext,
  ResolvedBatchLine,
} from '../batches.types.js';

/**
 * The batch snapshot: the shared catalog walk bound to the batch line resolver.
 */
export function snapshotBatchLines(
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
export function snapshotBatchLine(
  product: ProductContext,
  line: CreateBatchLineInput,
): ResolvedBatchLine {
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

export function requirePurchasableUnit(line: CreateBatchLineInput, product: ProductContext) {
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
