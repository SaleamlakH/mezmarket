import type { ProductSummaryResponse, ProductUnitOptionResponse } from '@mez/types';
import { lineAmount } from '@/lib/lineTotal';
import { isCommitted, type SaleDraftLine } from '../state/saleDraft';

/** How a draft's lines are joined back to the catalog they point at. */
export interface SaleDraftCatalog {
  /** The catalog product a draft line points at. */
  productForId(productId: string): ProductSummaryResponse | undefined;
  /** The sellable units a product is offered in. */
  unitsForProduct(productId: string): ProductUnitOptionResponse[];
}

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

/** A catalog covering exactly one product — what a single product's view holds. */
export function catalogForProduct(
  productId: string,
  product: ProductSummaryResponse | undefined,
  units: ProductUnitOptionResponse[],
): SaleDraftCatalog {
  return {
    productForId: (id) => (id === productId ? product : undefined),
    unitsForProduct: (id) => (id === productId ? units : []),
  };
}

/** Joins one draft line with the unit it is sold in and its running amount. */
export function toCartItemLine(line: SaleDraftLine, catalog: SaleDraftCatalog): CartItemLine {
  const unit = catalog
    .unitsForProduct(line.productId)
    .find((entry) => entry.id === line.productUnitId);
  const unitPrice = unit?.price ?? null;
  return { line, unit, unitPrice, lineTotal: lineAmount(line.quantity, unitPrice) };
}

/** The committed lines of one product, joined and totalled. */
export function buildCartItem(
  lines: SaleDraftLine[],
  productId: string,
  catalog: SaleDraftCatalog,
): CartItem {
  const viewLines = lines
    .filter((line) => line.productId === productId && isCommitted(line))
    .map((line) => toCartItemLine(line, catalog));

  return {
    productId,
    product: catalog.productForId(productId),
    lines: viewLines,
    total: viewLines.reduce((sum, entry) => sum + (entry.lineTotal ?? 0), 0),
  };
}

/** Every product's committed lines, grouped into cart items in first-seen order. */
export function buildCartItems(lines: SaleDraftLine[], catalog: SaleDraftCatalog): CartItem[] {
  const itemsById = new Map<string, CartItem>();

  for (const line of lines) {
    if (!isCommitted(line) || itemsById.has(line.productId)) continue;
    itemsById.set(line.productId, buildCartItem(lines, line.productId, catalog));
  }

  return [...itemsById.values()];
}
