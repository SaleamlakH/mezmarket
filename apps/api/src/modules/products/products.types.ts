import type {
  Product,
  ProductUnit,
  ProductWithUnits,
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
  AttachmentRecord,
};

export type ProductRecordWithAttachments = ProductRecord & {
  attachments: AttachmentRecord[];
  productUnits?: ProductUnitRecord[];
};

export type ProductRecordWithUnits = ProductRecord & {
  productUnits: ProductUnitRecord[];
};

export type CreateProductRepoResult = ProductRecord & {
  units: ProductUnitRecord[];
  attachment: AttachmentRecord | null;
};

export type ProductRepository = {
  list(businessId: string, branchId: string): Promise<ProductRecordWithUnits[]>;
  getById(id: string, businessId: string): Promise<ProductRecordWithUnits | null>;
  createForBusiness(
    businessId: string,
    branchId: string,
    input: CreateProductInput,
  ): Promise<CreateProductRepoResult>;
  listAttachmentsForProducts(productIds: string[]): Promise<AttachmentRecord[]>;
  getProductAttachment(productId: string): Promise<AttachmentRecord | null>;
};

export type ProductService = {
  listProducts(
    businessId: string | undefined,
    branchId: string | undefined,
  ): Promise<ProductWithUnits[]>;
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
