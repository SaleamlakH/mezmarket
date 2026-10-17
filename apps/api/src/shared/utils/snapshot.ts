import { AppError, ERROR_CODES } from '../errors/app-error.js';
import type { UnitDependsOn } from '../../../generated/prisma/enums.js';
import type { ProductUnitContext } from '../types/unit.types.js';

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
 * Resolves a quantity to its standard unit, converting a CUSTOM row through its
 * dependsOn role.
 */
export function resolveToStandard(
  quantity: number,
  unit: ProductUnitContext,
  productUnits: ProductUnitContext[],
): { id: string; symbol: string; quantity: number } {
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
    quantity: convertToStandardQuantity(productUnits, unit, unit.dependsOn || 'BASE', quantity),
    id: resolvedUnit.standardUnit.id,
    symbol: resolvedUnit.standardUnit.symbol,
  };
}

/**
 * Converts a quantity of `unit` to `targetRole`'s standard unit; an MOU rate
 * divides, STANDARD/CUSTOM rates multiply.
 */
export function convertToStandardQuantity(
  productUnits: ProductUnitContext[],
  unit: ProductUnitContext,
  targetRole: UnitDependsOn,
  quantity: number,
): number {
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

  // A CUSTOM reaching an MOU target hops once more down to BASE.
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
