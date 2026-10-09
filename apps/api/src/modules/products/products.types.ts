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
} from '@mez/types';

import type {
  Attachment as AttachmentRecord,
  Product as ProductRecord,
  ProductUnit as ProductUnitRecord,
} from '../../../generated/prisma/client.js';

export type {
  Product,
  ProductUnit,
  ProductWithUnits,
  CreateProductInput,
  CreateBaseUnitInput,
  CreateMouInput,
  CreateProductResult,
  ProductRecord,
  ProductUnitRecord,
  ProductSummary,
  ProductUnitOption,
  AttachmentRecord,
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

export type ProductRepository = {
  listForBusiness(businessId: string, branchId: string): Promise<ProductRecordWithBaseUnit[]>;
  getByIdWithUnits(id: string, businessId: string): Promise<ProductRecordWithUnits | null>;
  createForBusiness(
    businessId: string,
    branchId: string,
    input: CreateProductInput,
  ): Promise<CreateProductRepoResult>;
  listAttachmentsForProducts(productIds: string[]): Promise<AttachmentRecord[]>;
  getProductAttachment(productId: string): Promise<AttachmentRecord | null>;
};

export type ProductService = {
  listProducts(scope: ProductScope): Promise<ProductSummary[]>;
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
  resolveUploadId(productId: string | undefined, businessId: string | undefined): Promise<string>;
  resolveUploadIds(businessId: string | undefined, branchId: string | undefined): Promise<string[]>;
};
