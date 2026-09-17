import type {
  Dimension as DimensionRecord,
  Product as ProductRecord,
  ProductUnit as ProductUnitRecord,
  StandardUnit as StandardUnitRecord,
  UnitDependsOn,
  UnitRole,
} from '../../../generated/prisma/client.js';

export type {
  DimensionRecord,
  ProductRecord,
  ProductUnitRecord,
  StandardUnitRecord,
  UnitDependsOn,
  UnitRole,
};

export type Product = Omit<ProductRecord, 'lowStockThreshold' | 'currentSealedStock'> & {
  lowStockThreshold: number | null;
  currentSealedStock: number;
};

export type ProductUnit = Omit<ProductUnitRecord, 'conversionRate' | 'price'> & {
  conversionRate: number | null;
  price: number | null;
};

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
};
export type CreateProductResult = Product & {
  units: ProductUnit[];
};

export type CreateProductRepoResult = ProductRecord & {
  units: ProductUnitRecord[];
};

export type ProductRepository = {
  list(businessId: string, branchId: string): Promise<ProductRecord[]>;
  getById(id: string, businessId: string): Promise<ProductRecord | null>;
  createForBusiness(
    businessId: string,
    branchId: string,
    input: CreateProductInput,
  ): Promise<CreateProductRepoResult>;
};

export type ProductService = {
  listProducts(businessId: string | undefined, branchId: string | undefined): Promise<Product[]>;
  getProduct(
    id: string | undefined,
    businessId: string | undefined,
    branchId: string | undefined,
  ): Promise<Product>;
  createProduct(
    businessId: string | undefined,
    branchId: string | undefined,
    input: CreateProductInput,
  ): Promise<CreateProductResult>;
};
