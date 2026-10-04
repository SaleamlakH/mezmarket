import type { RequireAllKeys } from '../shared/require-all-keys.js';

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
 * Domain shape of a Product as stored in the database. Decimal columns are
 * held as plain numbers.
 */
export interface Product {
  id: string;
  businessId: string;
  branchId: string;
  categoryId: string | null;
  name: string;
  brand: string | null;
  description: string | null;
  photoUrl: string | null;
  trackAsPartial: boolean;
  lowStockThreshold: number | null;
  currentSealedStock: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain shape of a ProductUnit as stored in the database. Decimal columns are
 * held as plain numbers.
 */
export interface ProductUnit {
  id: string;
  productId: string;
  unitRole: UnitRole;
  standardUnitId: string | null;
  name: string;
  dependsOn: UnitDependsOn | null;
  conversionRate: number | null;
  price: number | null;
  purchaseCapable: boolean;
  sellCapable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JSON-serialized product shape sent to the frontend. Dates are serialized
 * to strings.
 */
export type ProductResponse = RequireAllKeys<
  Product,
  Omit<Product, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }
>;

/**
 * Product datas for product pickers
 */
export type ProductSummary = Pick<
  Product,
  'id' | 'name' | 'brand' | 'currentSealedStock' | 'lowStockThreshold' | 'active'
> & {
  baseUnitLabel: string;
};

export type ProductSummaryResponse = ProductSummary;

export type StockStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';

/**
 * Summarized inventory information for a product. Quantities are expressed in
 * the product's Base Unit unless stated otherwise.
 */
export type ProductInventorySummary = ProductSummary & {
  currentSealedStock: number;
  baseUnitLabel: string;
  totalCost: number;
  earliestExpiry: Date | null;
  expiryCount: number;
  numberOfBatches: number;
  stockStatus: StockStatus;
};

/**
 * JSON-serialized inventory summary sent to the frontend. Dates are serialized
 * to ISO 8601 strings.
 */
export type ProductInventorySummaryResponse = RequireAllKeys<
  ProductInventorySummary,
  Omit<ProductInventorySummary, 'createdAt' | 'updatedAt' | 'earliestExpiry'> & {
    createdAt: string;
    updatedAt: string;
    earliestExpiry: string | null;
  }
>;

/**
 * A transactable unit of a product, as returned by the per-product units
 * endpoint, projected off the domain shape down to what a unit picker row
 * renders.
 */
export type ProductUnitOption = Pick<
  ProductUnit,
  | 'id'
  | 'productId'
  | 'name'
  | 'purchaseCapable'
  | 'sellCapable'
  | 'unitRole'
  | 'dependsOn'
  | 'conversionRate'
>;

/**
 * JSON-serialized form of a ProductUnitOption sent to the frontend. It carries
 * no timestamps, so it needs no conversion. A list of these is the per-product
 * units endpoint's payload.
 */
export type ProductUnitOptionResponse = ProductUnitOption;
