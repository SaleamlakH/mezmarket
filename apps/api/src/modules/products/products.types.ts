import type {
  Product,
  ProductUnit,
  ProductWithUnits,
  ProductSummary,
  ProductUnitOption,
  CreateProductInput,
  CreateBaseUnitInput,
  CreateMouInput,
  CreateProductResult,
  CreateProductUnitInput,
  CreateProductUnitResult,
  UpdateProductInput,
  UpdateProductUnitInput,
  UpdateProductUnitsInput,
  UpdateProductUnitsResult,
  ProductListFilters,
} from '@mez/types';

import type {
  Attachment as AttachmentRecord,
  Product as ProductRecord,
  ProductUnit as ProductUnitRecord,
  StandardUnit as StandardUnitRecord,
  UnitRole,
  UnitDependsOn,
} from '../../../generated/prisma/client.js';

export type {
  Product,
  ProductUnit,
  ProductWithUnits,
  CreateProductInput,
  CreateBaseUnitInput,
  CreateMouInput,
  CreateProductResult,
  CreateProductUnitInput,
  CreateProductUnitResult,
  UpdateProductInput,
  UpdateProductUnitInput,
  UpdateProductUnitsInput,
  UpdateProductUnitsResult,
  ProductRecord,
  ProductUnitRecord,
  ProductSummary,
  ProductUnitOption,
  AttachmentRecord,
  StandardUnitRecord,
  ProductListFilters,
};

export type ProductRecordWithAttachments = ProductRecord & {
  attachments: AttachmentRecord[];
  productUnits?: ProductUnitRecord[];
};
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

export type CreateProductRepoResult = ProductRecord & {
  units: ProductUnitRecord[];
  attachment: AttachmentRecord | null;
};

/** The product a request is about, with its units and the live claim on its image. */
export type UpdateProductRepoResult = ProductRecord & {
  productUnits: ProductUnitRecord[];
  attachments: AttachmentRecord[];
};

/** The existing image a replacement should reuse, or `null` when there is none. */
export type UploadTarget = {
  productId: string;
  uploadId: string | null;
};

/**
 * Everything a product create needs once the service has resolved it: the product
 * fields as the request gave them, plus the standard units the base and content units
 * are built from. The repository only writes; it never decides whether a unit exists.
 */
export type CreateProductCommand = {
  businessId: string;
  branchId: string;
  product: CreateProductInput;
  baseStandardUnit: { id: string; name: string };
  mouStandardUnit?: { id: string; name: string };
};

/** The fields one product-unit row is created from. */
export type ProductUnitWrite = {
  productId: string;
  unitRole: UnitRole;
  standardUnitId: string | null;
  name: string;
  dependsOn: UnitDependsOn | null;
  conversionRate: number | null;
  price?: number;
  purchaseCapable: boolean;
  sellCapable: boolean;
};

/** The fields one product-unit row edit may carry; an absent one is left as it is. */
export type ProductUnitUpdate = {
  id: string;
  name?: string;
  price?: number | null;
  purchaseCapable?: boolean;
  sellCapable?: boolean;
};

/**
 * Reads and writes only. The service decides what a request means — which rows are
 * editable, what a clash should say — and hands this layer commands and rows to
 * persist.
 */
export type ProductRepository = {
  listForBusiness(
    businessId: string,
    branchId: string,
    filters: ProductListFilters,
  ): Promise<ProductRecordWithBaseUnit[]>;
  getByIdWithUnits(id: string, businessId: string): Promise<ProductRecordWithUnits | null>;
  listAttachmentsForProducts(productIds: string[]): Promise<AttachmentRecord[]>;
  getProductAttachment(productId: string): Promise<AttachmentRecord | null>;
  findStandardUnits(ids: string[]): Promise<StandardUnitRecord[]>;
  createProduct(command: CreateProductCommand): Promise<CreateProductRepoResult>;
  createUnit(data: ProductUnitWrite): Promise<UpdateProductRepoResult>;
  updateUnits(productId: string, writes: ProductUnitUpdate[]): Promise<UpdateProductRepoResult>;
  updateProduct(productId: string, input: UpdateProductInput): Promise<UpdateProductRepoResult>;
  setActive(productId: string, active: boolean): Promise<UpdateProductRepoResult>;
};

export type ProductService = {
  listProducts(scope: ProductScope, filters: ProductListFilters): Promise<ProductSummary[]>;
  listProductUnits(scope: ProductScope, productId: string): Promise<ProductUnitOption[]>;
  getProduct(
    id: string | undefined,
    businessId: string | undefined,
    branchId: string | undefined,
  ): Promise<ProductWithUnits>;
  createProduct(
    businessId: string | undefined,
    branchId: string | undefined,
    input: CreateProductInput,
  ): Promise<CreateProductResult>;
  createProductUnit(
    id: string | undefined,
    businessId: string | undefined,
    branchId: string | undefined,
    input: CreateProductUnitInput,
  ): Promise<CreateProductUnitResult>;
  updateProduct(
    id: string | undefined,
    businessId: string | undefined,
    branchId: string | undefined,
    input: UpdateProductInput,
  ): Promise<ProductWithUnits>;
  updateProductUnits(
    id: string | undefined,
    businessId: string | undefined,
    branchId: string | undefined,
    input: UpdateProductUnitsInput,
  ): Promise<UpdateProductUnitsResult>;
  setProductActive(
    id: string | undefined,
    businessId: string | undefined,
    branchId: string | undefined,
    active: boolean,
  ): Promise<ProductWithUnits>;
  resolveUploadId(productId: string | undefined, businessId: string | undefined): Promise<string>;
  resolveUploadTarget(
    productId: string | undefined,
    businessId: string | undefined,
  ): Promise<UploadTarget>;
  resolveUploadIds(businessId: string | undefined, branchId: string | undefined): Promise<string[]>;
};
