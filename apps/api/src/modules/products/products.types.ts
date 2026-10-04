import type { ProductSummary, ProductUnitOption } from '@mez/types';

import {
  type Product as ProductRecord,
  type ProductUnit as ProductUnitRecord,
} from '../../../generated/prisma/client.js';

export type { ProductSummary, ProductUnitOption, ProductUnitRecord };

export type ProductRecordWithBaseUnit = ProductRecord & {
  productUnits: ProductUnitRecord[];
};

export type ProductRecordWithUnits = ProductRecord & {
  productUnits: ProductUnitRecord[];
};

/**
 * The scope the business module's authorize middleware resolved onto the
 * request by the time a controller runs.
 */
export type ProductScope = {
  businessId: string;
  branchId: string;
};

export type ProductRepository = {
  listProducts(businessId: string, branchId: string): Promise<ProductRecordWithBaseUnit[]>;
  getProductWithUnits(
    businessId: string,
    productId: string,
  ): Promise<ProductRecordWithUnits | null>;
};

export type ProductService = {
  listProducts(scope: ProductScope): Promise<ProductSummary[]>;
  listProductUnits(scope: ProductScope, productId: string): Promise<ProductUnitOption[]>;
};
