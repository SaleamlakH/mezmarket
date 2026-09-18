import type {
  Attachment as AttachmentRecord,
  AttachmentRecordType,
  Dimension as DimensionRecord,
  Product as ProductRecord,
  ProductUnit as ProductUnitRecord,
  StandardUnit as StandardUnitRecord,
  UnitDependsOn,
  UnitRole,
} from '../../../generated/prisma/client.js';

export type {
  AttachmentRecord,
  AttachmentRecordType,
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
  uploadId: string | null;
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
  uploadId?: string;
};
export type CreateProductResult = Product & {
  units: ProductUnit[];
};

export type ProductRecordWithAttachments = ProductRecord & {
  attachments: AttachmentRecord[];
};

export type CreateProductRepoResult = ProductRecord & {
  units: ProductUnitRecord[];
  attachment: AttachmentRecord | null;
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

export type AttachmentsRepository = {
  listForRecord(recordType: AttachmentRecordType, recordIds: string[]): Promise<AttachmentRecord[]>;
  getForRecord(
    recordType: AttachmentRecordType,
    recordId: string,
  ): Promise<AttachmentRecord | null>;
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
