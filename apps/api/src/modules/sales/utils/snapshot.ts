import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import {
  conversionUnitsOf,
  snapshotLines,
  resolveToStandard,
  convertToStandardQuantity,
} from '../../../shared/utils/snapshot.js';
import type { ConversionUnits, ProductUnitContext } from '../../../shared/types/unit.types.js';
import type { CreateSaleInput, ProductSellContext, ResolvedSaleLine } from '../sales.types.js';
import { roundQuantity } from '../../../shared/utils/rounding.js';

/**
 * The sale snapshot: the shared catalog walk bound to the sale line resolver,
 * which is where a sale line differs from any other line.
 */
export function snapshotSaleLines(
  products: ProductSellContext[],
  businessId: string,
  lines: CreateSaleInput['lines'],
): ResolvedSaleLine[] {
  return snapshotLines(products, businessId, lines, snapshotSaleLine);
}

/** The sale-only part of a line: which unit was sold and at what price. */
export function snapshotSaleLine(
  product: ProductSellContext,
  line: CreateSaleInput['lines'][number],
): ResolvedSaleLine {
  const units = conversionUnitsOf(product.productUnits, line.productUnitId);
  const unit = requireSellableUnit(units);
  const unitPrice = requireSellingPrice(unit);
  const standard = resolveToStandard(line.quantity, units);
  const quantityInBaseUnit = convertToStandardQuantity(units, 'BASE', line.quantity);

  return {
    productId: product.id,
    productName: product.name,
    productUnitId: unit.id,
    soldUnit: unit.name,
    quantity: line.quantity,
    standardUnit: standard.symbol,
    quantityInStandardUnit: standard.quantity,
    quantityInBaseUnit: roundQuantity(quantityInBaseUnit),
    resolvedStandardUnitId: standard.id,
    unitPrice,
    // Filled in once the lots are in hand; nothing may be sold unallocated without
    // going through `allocateStock`.
    allocations: [],
  };
}

export function requireSellableUnit(units: ConversionUnits): ProductUnitContext {
  if (!units.sourceUnit) {
    throw new AppError(
      ERROR_CODES.BAD_REQUEST,
      'The selected unit does not belong to this product',
      400,
      { productUnitId: 'This unit does not belong to the product' },
    );
  }

  if (!units.sourceUnit.sellCapable) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'The selected unit cannot be sold', 400, {
      productUnitId: 'This unit cannot be sold',
    });
  }

  return units.sourceUnit;
}

/** The price a unit sells at, snapshotted onto the line. A unit without one cannot be sold. */
export function requireSellingPrice(unit: ProductUnitContext): number {
  const unitPrice = unit.price?.toNumber();

  if (unitPrice == null) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'The selected unit carries no price', 400, {
      productUnitId: 'This unit has no price',
    });
  }

  return unitPrice;
}
