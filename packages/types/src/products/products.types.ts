/**
 * What a product's unit row represents. `BASE` is the unit stock is tracked in,
 * `MOU` is the measurable content one base unit holds, `STANDARD` is a
 * same-dimension standard unit deliberately added to the product, and `CUSTOM` is
 * an owner-defined portion or label (`shot = 25 ml`, `bottle = 1 pc`).
 */
export type UnitRole = 'BASE' | 'MOU' | 'STANDARD' | 'CUSTOM';

/**
 * What a unit's conversion rate is measured against. Only the product's own base
 * and content units can be depended on — no other unit in the catalog.
 */
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
  price: number;
}

export interface CreateMouInput {
  unitId: string;
  conversionRate: number;
  price?: number;
}

/**
 * What every custom unit has regardless of what it may be used for.
 *
 * `conversionRate` is relative to the unit named by `dependsOn` — a number, not
 * a fraction, so `shot = 25 ml` is `25` and `slice = 1/8 pc` is `0.125`. Values
 * above 1 are ordinary: `box = 12 pc` is a pack, not a portion.
 */
interface CustomUnitCommon {
  name: string;
  dependsOn: UnitDependsOn;
  conversionRate: number;
  purchaseCapable: boolean;
}

/**
 * An owner-defined unit for a product: either a conventional portion the world
 * has no standard unit for (`shot = 25 ml`, `slice = 1/8 pc`) or a friendly
 * relabel of a unit the product already trades in (`bottle = 1 pc`).
 *
 * The role is absent from this input on purpose. A custom unit is always a
 * `CUSTOM` row, and the role a row takes is not the caller's to choose — the same
 * way the repository decides a base unit's name from the standard unit it
 * resolved rather than trusting a name in the body.
 *
 * A price is required exactly when the unit can be sold, which is what makes the
 * two branches below rather than one type with an optional price: nothing can be
 * sold without a price, but a purchase-only unit has no price to give. A unit
 * flagged for both needs one, because selling is one of the things it does.
 */
export type CreateCustomUnitInput =
  | (CustomUnitCommon & { sellCapable: true; price: number })
  | (CustomUnitCommon & { sellCapable: false; price?: number });

export type CreateProductInput = Pick<
  Product,
  'name' | 'brand' | 'description' | 'lowStockThreshold' | 'trackAsPartial' | 'categoryId'
> & {
  baseUnit: CreateBaseUnitInput;
  mou?: CreateMouInput;
  /**
   * The owner's own units for the product, created alongside it rather than added
   * afterwards, so a product never exists holding half of what it was configured
   * with. Optional because a product does not need one: most are only ever traded
   * in their base and content units.
   *
   * A unit based on the content unit needs that content unit to exist, which is
   * why the two travel in one request — an owner creating `shot = 25 ml` for a
   * product with no content unit yet sends the content unit and the shot together,
   * or the shot has nothing to be based on.
   */
  customUnits?: CreateCustomUnitInput[];
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
