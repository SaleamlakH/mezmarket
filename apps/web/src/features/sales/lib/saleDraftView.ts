import type { ProductSummaryResponse, ProductUnitOptionResponse } from '@mez/types';
import { lineAmount } from '@/lib/lineTotal';
import { getSaleProductUnits, saleProductsFixture } from '../fixtures/saleFlow';
import { isCommitted, type SaleDraftLine } from '../state/saleDraft';

/** A committed draft line joined with the catalog entries it points at. */
export interface CartItemLine {
  line: SaleDraftLine;
  unit: ProductUnitOptionResponse | undefined;
  unitPrice: number | null;
  lineTotal: number | null;
}

/** A product in the cart — its committed lines and the total they come to. */
export interface CartItem {
  productId: string;
  product: ProductSummaryResponse | undefined;
  lines: CartItemLine[];
  total: number;
}

/** The sellable units a product is offered in. */
export function unitsForProduct(productId: string): ProductUnitOptionResponse[] {
  return getSaleProductUnits(productId);
}

/** The catalog product a draft line points at. */
export function productForId(productId: string): ProductSummaryResponse | undefined {
  return saleProductsFixture.find((entry) => entry.id === productId);
}

/** Joins one draft line with the unit it is sold in and its running amount. */
export function toCartItemLine(line: SaleDraftLine): CartItemLine {
  const unit = unitsForProduct(line.productId).find((entry) => entry.id === line.productUnitId);
  const unitPrice = unit?.price ?? null;
  return { line, unit, unitPrice, lineTotal: lineAmount(line.quantity, unitPrice) };
}

/** The committed lines of one product, joined and totalled. */
export function buildCartItem(lines: SaleDraftLine[], productId: string): CartItem {
  const viewLines = lines
    .filter((line) => line.productId === productId && isCommitted(line))
    .map(toCartItemLine);

  return {
    productId,
    product: productForId(productId),
    lines: viewLines,
    total: viewLines.reduce((sum, entry) => sum + (entry.lineTotal ?? 0), 0),
  };
}

/** Every product's committed lines, grouped into cart items in first-seen order. */
export function buildCartItems(lines: SaleDraftLine[]): CartItem[] {
  const itemsById = new Map<string, CartItem>();

  for (const line of lines) {
    if (!isCommitted(line) || itemsById.has(line.productId)) continue;
    itemsById.set(line.productId, buildCartItem(lines, line.productId));
  }

  return [...itemsById.values()];
}
