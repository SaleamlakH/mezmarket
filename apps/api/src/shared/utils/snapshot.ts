import { AppError, ERROR_CODES } from '../errors/app-error.js';
import type { UnitDependsOn } from '../../../generated/prisma/enums.js';
import type { StoredDecimal } from '../types/decimal.types.js';
import type { ConversionUnits, ProductUnitContext } from '../types/unit.types.js';

/**
 * Resolves each line against the business's own catalog, 404ing on a product
 * the business does not have. The per-line work is supplied by each snapshot.
 */
export function snapshotLines<
  TProduct extends { id: string; businessId: string },
  TLine extends { productId: string },
  TResult,
>(
  products: TProduct[],
  businessId: string,
  lines: TLine[],
  resolveLine: (product: TProduct, line: TLine) => TResult,
): TResult[] {
  const catalog = new Map(
    products
      .filter((product) => product.businessId === businessId)
      .map((product) => [product.id, product]),
  );

  return lines.map((line) => {
    const product = catalog.get(line.productId);

    if (!product) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404);
    }

    return resolveLine(product, line);
  });
}

/**
 * Finds the units a conversion needs in one pass: the source unit, the
 * product's Base Unit, and its MOU when one exists.
 */
export function conversionUnitsOf(
  productUnits: ProductUnitContext[],
  sourceUnitId: string | null,
): ConversionUnits {
  let sourceUnit: ProductUnitContext | null = null;
  let sourceBaseUnit: ProductUnitContext | null = null;
  let mouUnit: ProductUnitContext | null = null;

  for (const unit of productUnits) {
    if (unit.id === sourceUnitId) sourceUnit = unit;
    if (sourceBaseUnit === null && unit.unitRole === 'BASE') sourceBaseUnit = unit;
    if (mouUnit === null && unit.unitRole === 'MOU') mouUnit = unit;

    if (sourceUnit && sourceBaseUnit && mouUnit) break;
  }

  return { sourceUnit, sourceBaseUnit, mouUnit };
}

/** The unit the source depends on, if it has one. */
export function dependsOnUnitOf(units: ConversionUnits): ProductUnitContext | null {
  const role = units.sourceUnit?.dependsOn;

  if (role === 'BASE') return units.sourceBaseUnit;
  if (role === 'MOU') return units.mouUnit;
  return null;
}

/**
 * Resolves a quantity to its standard unit, converting a CUSTOM row through its
 * dependsOn role.
 */
export function resolveToStandard(
  quantity: number,
  units: ConversionUnits,
): { id: string; symbol: string; quantity: number } {
  const unit = units.sourceUnit;

  if (!unit) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'The conversion has no source unit', 500);
  }

  if (unit.standardUnit) {
    return {
      quantity,
      id: unit.standardUnit.id,
      symbol: unit.standardUnit.symbol,
    };
  }

  // Only a CUSTOM row may lack a standard unit.
  if (unit.unitRole !== 'CUSTOM') {
    throw new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      `The ${unit.unitRole} unit ${unit.name} has no linked standard unit`,
      500,
    );
  }

  const resolvedUnit = dependsOnUnitOf(units);

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
    quantity: convertToStandardQuantity(units, unit.dependsOn || 'BASE', quantity),
    id: resolvedUnit.standardUnit.id,
    symbol: resolvedUnit.standardUnit.symbol,
  };
}

/**
 * Converts a quantity of the source unit to `targetRole`'s standard unit; an
 * MOU rate divides, STANDARD/CUSTOM rates multiply. The product's MOU is only
 * needed when the conversion has to cross it.
 */
export function convertToStandardQuantity(
  units: ConversionUnits,
  targetRole: UnitDependsOn,
  quantity: number,
): number {
  const unit = units.sourceUnit;

  if (!unit) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'The conversion has no source unit', 500);
  }

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

  const convertedQuantity =
    unit.unitRole === 'MOU'
      ? quantity / unit.conversionRate.toNumber()
      : quantity * unit.conversionRate.toNumber();

  if (unit.dependsOn === targetRole) return convertedQuantity;

  // A unit that depends through the MOU hops once more down to BASE.
  if (!units.mouUnit?.conversionRate) {
    throw new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      `The product has no conversion rate on its MOU unit`,
      500,
    );
  }

  return convertedQuantity / units.mouUnit.conversionRate.toNumber();
}

/**
 * The base quantity a snapshot line bought. A missing unit or a zero conversion
 * reads as zero.
 */
export function quantityInBase(units: ConversionUnits, purchaseQuantity: StoredDecimal): number {
  if (!units.sourceUnit) return 0;

  const baseBought = convertToStandardQuantity(units, 'BASE', purchaseQuantity.toNumber());

  if (baseBought === 0) return 0;

  return baseBought;
}

/**
 * The cost of one base unit from a purchase-unit cost and the base quantity.
 */
export function unitCostPerBase(
  unitCost: number,
  baseQuantity: number,
  purchaseQuantity: number,
): number {
  if (baseQuantity === 0) return 0;

  return (unitCost * purchaseQuantity) / baseQuantity;
}
