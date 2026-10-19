import type { RequireAllKeys } from '../shared/require-all-keys.js';

// --- unit enums ---

/** A unit's place in its product's unit hierarchy. Mirrors the `UnitRole` Prisma enum. */
export type UnitRole = 'BASE' | 'MOU' | 'STANDARD' | 'CUSTOM';

/** The unit a `conversionRate` is measured against. Mirrors the `UnitDependsOn` Prisma enum. */
export type UnitDependsOn = 'BASE' | 'MOU';

// --- product ---

/** A Product as stored in the database. */
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

/** JSON form sent to the client; timestamps become strings. */
export type ProductResponse = RequireAllKeys<
  Product,
  Omit<Product, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }
>;

/** A ProductUnit as stored in the database. */
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

/** JSON form sent to the client; timestamps become strings. */
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

/** JSON form sent to the client; timestamps become strings and units convert too. */
export type ProductWithUnitsResponse = RequireAllKeys<
  ProductWithUnits,
  Omit<ProductWithUnits, 'createdAt' | 'updatedAt' | 'units'> & {
    createdAt: string;
    updatedAt: string;
    units: ProductUnitResponse[];
  }
>;

// --- product read shapes ---

export type ProductSummary = Pick<
  Product,
  'id' | 'name' | 'brand' | 'currentSealedStock' | 'lowStockThreshold' | 'active' | 'uploadId'
> & {
  baseUnitLabel: string;
};

export type ProductSummaryResponse = ProductSummary;

/** Which products a list request wants. */
export type ProductListStatus = 'active' | 'inactive' | 'all';

/** Filters a product-list request may carry. */
export interface ProductListFilters {
  status: ProductListStatus;
}

export type StockStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';

/** Inventory summary for a product; quantities are in its base unit. */
export type ProductInventorySummary = ProductSummary & {
  currentSealedStock: number;
  baseUnitLabel: string;
  totalCost: number;
  earliestExpiry: Date | null;
  expiryCount: number;
  numberOfBatches: number;
  stockStatus: StockStatus;
};

/** JSON form sent to the client; dates become strings. */
export type ProductInventorySummaryResponse = RequireAllKeys<
  ProductInventorySummary,
  Omit<ProductInventorySummary, 'createdAt' | 'updatedAt' | 'earliestExpiry'> & {
    createdAt: string;
    updatedAt: string;
    earliestExpiry: string | null;
  }
>;

/** A unit as a picker row shows it, cut down from `ProductUnit`. `price` is its selling price. */
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
  | 'price'
>;

/** JSON form of `ProductUnitOption`; it has no timestamps to convert. */
export type ProductUnitOptionResponse = ProductUnitOption;

// --- product fields ---

/** The product columns a create or full-replace edit writes. */
export type ProductFieldsInput = Pick<
  Product,
  'name' | 'brand' | 'description' | 'lowStockThreshold' | 'trackAsPartial' | 'categoryId'
>;

/** Product fields as the create/edit form holds them, before submit coerces text. */
export type ProductFieldsFormValues = Omit<
  ProductFieldsInput,
  'brand' | 'description' | 'lowStockThreshold' | 'trackAsPartial' | 'categoryId'
> & {
  brand?: string | undefined;
  description?: string | undefined;
  lowStockThreshold?: string | undefined;
  trackAsPartial?: boolean | undefined;
  categoryId?: string | undefined;
};

// --- create product ---

export interface CreateBaseUnitInput {
  unitId: string;
  price: number;
}

/** The base-unit fields as the create form holds them, before submit resolves the unit. */
export type CreateBaseUnitFormValues = Omit<CreateBaseUnitInput, 'price'> & {
  price: string;
  dimensionId: string;
};

/** The optional content unit: how much content one base unit holds. */
export interface CreateMouInput {
  unitId: string;
  conversionRate: number;
  price?: number;
}

/** The optional content-unit fields as the create form holds them. */
export type CreateMouFormValues = Omit<CreateMouInput, 'conversionRate' | 'price'> & {
  conversionRate: string;
  price?: string | undefined;
  dimensionId: string;
};

/**
 * A custom unit that is purchased but not sold. `conversionRate` is a plain number
 * relative to `dependsOn`, so `shot = 25 ml` is `25` and `box = 12 pc` is `12`.
 */
export interface PurchaseOnlyCustomUnitInput {
  name: string;
  dependsOn: UnitDependsOn;
  conversionRate: number;
  purchaseCapable: boolean;
  price?: number;
  sellCapable: false;
}

/** A purchase-only custom unit as the create form holds it. */
export type PurchaseOnlyCustomUnitFormValues = Omit<
  PurchaseOnlyCustomUnitInput,
  'conversionRate' | 'price'
> & {
  conversionRate: string;
  price?: string | undefined;
};

type SellableCustomUnitInput = Omit<PurchaseOnlyCustomUnitInput, 'price' | 'sellCapable'> & {
  sellCapable: true;
  price: number;
};

type SellableCustomUnitFormValues = Omit<
  PurchaseOnlyCustomUnitFormValues,
  'sellCapable' | 'price'
> & {
  sellCapable: true;
  price: string;
};

/**
 * An owner-defined unit: a portion the world has no standard unit for, or a
 * friendly relabel of one the product already trades in.
 *
 * The role is left out because a custom unit is always a `CUSTOM` row. `price` is
 * required exactly when `sellCapable` is true.
 */
export type CreateCustomUnitInput = PurchaseOnlyCustomUnitInput | SellableCustomUnitInput;

/** A custom unit as the create form holds it; price is text and follows `sellCapable`. */
export type CreateCustomUnitFormValues =
  | PurchaseOnlyCustomUnitFormValues
  | SellableCustomUnitFormValues;

export type CreateProductInput = ProductFieldsInput & {
  baseUnit: CreateBaseUnitInput;
  mou?: CreateMouInput;
  /**
   * The owner's own units, created with the product so it never exists
   * half-configured. Optional because most products trade only in their base and
   * content units. A unit based on the content unit has to travel with it, so the
   * two are sent in one request.
   */
  customUnits?: CreateCustomUnitInput[];
  uploadId?: string;
};

/** The create form's raw values: product fields as text where needed, plus the units. */
export type CreateProductFormValues = ProductFieldsFormValues & {
  baseUnit: CreateBaseUnitFormValues;
  mou?: CreateMouFormValues | undefined;
  customUnits: CreateCustomUnitFormValues[];
  uploadId?: string | undefined;
};

export type CreateProductResult = ProductWithUnits;

/** JSON form sent to the client. */
export type CreateProductResponse = ProductWithUnitsResponse;

// --- create product unit ---

/**
 * A content unit added to a product that already exists: a standard unit the product is
 * measured in.
 */
export interface CreateContentUnitInput {
  unitRole: 'MOU';
  unitId: string;
  conversionRate: number;
  /** Present when the content unit is sold on its own; a content unit is always sellable. */
  price?: number;
}

/**
 * One unit added to a product that already exists. It is the same shape as a unit
 * created with the product, plus the role that says which kind it is: an owner-defined
 * `CUSTOM` unit, or the single `MOU` content unit a product may carry.
 */
export type CreateProductUnitInput =
  | (CreateCustomUnitInput & { unitRole: 'CUSTOM' })
  | CreateContentUnitInput;

/** The refreshed product, including the unit that was written. */
export type CreateProductUnitResult = ProductWithUnits;

/** JSON form sent to the client. */
export type CreateProductUnitResponse = ProductWithUnitsResponse;

// --- update product ---

/**
 * A full replace of the product's own columns. The edit form sends every field, so a
 * cleared value is written rather than left behind. Units and the photo are not here —
 * each has its own endpoint.
 */
export type UpdateProductInput = ProductFieldsInput;

export type UpdateProductResult = ProductWithUnits;

/** JSON form sent to the client. */
export type UpdateProductResponse = ProductWithUnitsResponse;

// --- update base unit ---

/** The base unit's price, the only thing the owner may change about it. */
export interface UpdateBaseUnitInput {
  id: string;
  price: number;
}

/** The base-unit edit form's raw values. */
export type UpdateBaseUnitFormValues = Omit<UpdateBaseUnitInput, 'price'> & {
  price: string;
};

// --- update mou ---

/** The content unit's price; `null` clears a price that was never set. */
export interface UpdateMouInput {
  id: string;
  price: number | null;
}

/** The content-unit edit form's raw values. */
export type UpdateMouFormValues = Omit<UpdateMouInput, 'price'> & {
  price?: string | undefined;
};

// --- update custom unit ---

/**
 * A custom unit's editable fields. Its basis and conversion rate are not editable.
 * `price` is required exactly when `sellCapable` is true, and a full replace writes
 * it with the rest of the row.
 */
export type UpdateCustomUnitInput =
  | ({ id: string } & Omit<PurchaseOnlyCustomUnitInput, 'dependsOn' | 'conversionRate'>)
  | ({ id: string } & Omit<SellableCustomUnitInput, 'dependsOn' | 'conversionRate'>);

/** The custom-unit edit form's raw values. */
export type UpdateCustomUnitFormValues =
  | ({ id: string } & Omit<PurchaseOnlyCustomUnitFormValues, 'dependsOn' | 'conversionRate'>)
  | ({ id: string } & Omit<SellableCustomUnitFormValues, 'dependsOn' | 'conversionRate'>);

// --- update product units ---

/**
 * One row in a bulk unit edit. The role decides what may move: base and content rows
 * only restate their price, while a custom row may also change its name and capabilities.
 */
export type UpdateProductUnitInput =
  | ({ unitRole: 'BASE' } & UpdateBaseUnitInput)
  | ({ unitRole: 'MOU' } & UpdateMouInput)
  | ({ unitRole: 'CUSTOM' } & UpdateCustomUnitInput);

/** A bulk edit of a product's units; each row names the role the rules follow. */
export interface UpdateProductUnitsInput {
  units: UpdateProductUnitInput[];
}

/** The refreshed product after its units are edited. */
export type UpdateProductUnitsResult = ProductWithUnits;

/** JSON form sent to the client. */
export type UpdateProductUnitsResponse = ProductWithUnitsResponse;

// --- update product photo ---

/** The refreshed product carrying the new photo `uploadId`. */
export type UpdateProductPhotoResult = ProductWithUnits;

/** JSON form sent to the client. */
export type UpdateProductPhotoResponse = ProductWithUnitsResponse;

// --- update product active ---

/** An activate/deactivate request body. */
export interface UpdateProductActiveInput {
  active: boolean;
}

/** The refreshed product after an activation change. */
export type UpdateProductActiveResult = ProductWithUnits;

/** JSON form sent to the client. */
export type UpdateProductActiveResponse = ProductWithUnitsResponse;
