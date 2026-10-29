import type { FieldErrors } from '@mez/validation';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import { conversionUnitsOf, convertToStandardQuantity } from '../../../shared/utils/snapshot.js';
import { roundQuantity } from '../../../shared/utils/rounding.js';
import type { CreateSaleInput, ProductSellContext } from '../sales.types.js';
import { collectStockErrors } from './stock.js';

/**
 * Checks every line of the sale before anything is snapshotted or drawn. Unit
 * errors use the line's `productUnitId` path; stock errors use the first line's
 * `productId` path, so the client can point at the right cart item. All
 * problems are collected and answered together rather than stopping at the
 * first one.
 */
export function assertSaleLines(
  products: ProductSellContext[],
  businessId: string,
  lines: CreateSaleInput['lines'],
  allowNegativeStock: boolean,
): void {
  const catalog = new Map(
    products
      .filter((product) => product.businessId === businessId)
      .map((product) => [product.id, product]),
  );
  const details: FieldErrors<CreateSaleInput> = {};
  const drawable: Array<{ productId: string; quantityInBaseUnit: number }> = [];

  for (const [index, line] of lines.entries()) {
    const product = catalog.get(line.productId);
    const unitPath: `lines.${number}.productUnitId` = `lines.${index}.productUnitId`;

    if (!product) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404);
    }

    const units = conversionUnitsOf(product.productUnits, line.productUnitId);

    if (!units.sourceUnit) {
      details[unitPath] = 'This unit does not belong to the product';
      continue;
    }

    if (!units.sourceUnit.sellCapable) {
      details[unitPath] = `The unit "${units.sourceUnit.name}" cannot be sold`;
    } else if (units.sourceUnit.price?.toNumber() == null) {
      details[unitPath] = `The unit "${units.sourceUnit.name}" has no price`;
    }

    drawable.push({
      productId: product.id,
      quantityInBaseUnit: roundQuantity(convertToStandardQuantity(units, 'BASE', line.quantity)),
    });
  }

  if (!allowNegativeStock) {
    const stockErrors = collectStockErrors(products, drawable);
    const reported = new Set<string>();

    lines.forEach((line, index) => {
      const message = stockErrors[line.productId];
      if (message && !reported.has(line.productId)) {
        details[`lines.${index}.productId`] = message;
        reported.add(line.productId);
      }
    });
  }

  if (Object.keys(details).length > 0) {
    throw new AppError(
      ERROR_CODES.BAD_REQUEST,
      'Some items in the sale cannot be sold',
      400,
      details,
    );
  }
}
