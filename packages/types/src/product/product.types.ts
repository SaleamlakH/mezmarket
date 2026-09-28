/**
 * How a ProductUnit relates to its product's unit hierarchy.
 * Mirrors the `UnitRole` Prisma enum.
 */
export type UnitRole = 'BASE' | 'MOU' | 'STANDARD' | 'CUSTOM';

/**
 * Which unit a ProductUnit's `conversionRate` is relative to.
 * Mirrors the `UnitDependsOn` Prisma enum.
 */
export type UnitDependsOn = 'BASE' | 'MOU';

/**
 * A product as returned by the product list endpoint, trimmed to what a
 * picker needs to render a row.
 */
export interface ProductSummaryResponse {
  id: string;
  name: string;
  brand: string | null;
  /** Display label of the product's Base Unit, e.g. `"Bottle"`. */
  baseUnitName: string;
  currentSealedStock: number;
  active: boolean;
}

/**
 * A transactable unit of a product, as returned by the per-product units
 * endpoint. A batch line picks one of these with `purchaseCapable` set.
 */
export interface ProductUnitOptionResponse {
  id: string;
  productId: string;
  name: string;
  unitRole: UnitRole;
  /** Null only for the Base Unit row itself. */
  dependsOn: UnitDependsOn | null;
  /** How many of this unit equal one `dependsOn` unit. */
  conversionRate: number | null;
  /** Set for BASE/MOU/STANDARD rows, null for CUSTOM ones. */
  standardUnitId: string | null;
  standardUnitName: string | null;
  purchaseCapable: boolean;
  sellCapable: boolean;
  price: number | null;
}

/**
 * Return shape of the product list endpoint.
 */
export interface ProductListResponse {
  products: ProductSummaryResponse[];
}

/**
 * Return shape of the per-product units endpoint.
 */
export interface ProductUnitsResponse {
  units: ProductUnitOptionResponse[];
}
