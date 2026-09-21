export type UnitRole = 'BASE' | 'MOU' | 'STANDARD' | 'CUSTOM';

export type UnitDependsOn = 'BASE' | 'MOU';

/**
 * Constrains `T` so every key of `Source` must be present, forcing derived
 * response types to mirror the source type's keys.
 */
type RequireAllKeys<Source, T extends Record<keyof Source, unknown>> = T;

/**
 * Domain shape of a Product as stored in the database.
 */
export interface Product {
  id: string;
  businessId: string;
  branchId: string;
  categoryId: string | null;
  name: string;
  brand: string | null;
  description: string | null;
  trackAsPartial: boolean;
  lowStockThreshold: number | null;
  currentSealedStock: number;
  active: boolean;
  uploadId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JSON-serialized form sent to the frontend.
 */
export type ProductResponse = RequireAllKeys<
  Product,
  Omit<Product, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }
>;

/**
 * Domain shape of a ProductUnit as stored in the database.
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
 * JSON-serialized form sent to the frontend.
 */
export type ProductUnitResponse = RequireAllKeys<
  ProductUnit,
  Omit<ProductUnit, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }
>;

export type ProductWithUnits = Product & {
  units: ProductUnit[];
};

/**
 * JSON-serialized form sent to the frontend.
 */
export type ProductWithUnitsResponse = RequireAllKeys<
  ProductWithUnits,
  Omit<ProductWithUnits, 'createdAt' | 'updatedAt' | 'units'> & {
    createdAt: string;
    updatedAt: string;
    units: ProductUnitResponse[];
  }
>;

export interface CreateBaseUnitInput {
  unitId: string;
  price: string;
}

export interface CreateMouInput {
  unitId: string;
  conversionRate: number;
  price?: number;
}

export type CreateProductInput = Pick<
  Product,
  'name' | 'brand' | 'description' | 'lowStockThreshold' | 'trackAsPartial' | 'categoryId'
> & {
  baseUnit: CreateBaseUnitInput;
  mou?: CreateMouInput;
  uploadId?: string;
};

/**
 * Domain shape of a created Product.
 */
export type CreateProductResult = ProductWithUnits;

/**
 * JSON-serialized form sent to the frontend.
 */
export type CreateProductResponse = ProductWithUnitsResponse;
