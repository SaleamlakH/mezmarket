import type {
  BusinessMember,
  CreateBatchInput,
  CreateBatchLineInput,
  CreateBatchResult,
  ProductInventorySummary,
  StockBatch,
  StockBatchDetailResult,
  StockBatchLine,
  StockStatus,
  UnitRole,
} from '@mez/types';

import type {
  Attachment as AttachmentRecord,
  Product,
  StockBatchLine as StockBatchLineRecord,
  StandardUnit,
  ProductUnit,
} from '../../../generated/prisma/client.js';

export type {
  CreateBatchInput,
  CreateBatchLineInput,
  CreateBatchResult,
  ProductInventorySummary,
  StockBatchDetailResult,
  StockStatus,
  UnitRole,
};

/**
 * A `Decimal` column as Prisma hands it back. The service narrows these to
 * the plain numbers the wire contract uses.
 */
export type StoredDecimal = {
  toNumber(): number;
};

export type StandardUnitContext = Pick<StandardUnit, 'id' | 'name' | 'symbol'>;

/**
 * A product's units, trimmed to the fields the unit math walks: the role that
 * places it in the hierarchy, the standard unit it resolves to (null for a
 * CUSTOM row, which is what makes the walk continue), the unit its own factor
 * is relative to, and whether stock may be bought in it.
 */
export type ProductUnitContext = Omit<ProductUnit, 'price'> & {
  standardUnit: StandardUnitContext | null;
};

export type ProductContext = {
  id: string;
  businessId: string;
  productUnits: ProductUnitContext[];
};

/**
 * A line with its unit snapshots resolved and its contribution to the
 * product's sealed stock worked out, ready to be written.
 */
export type ResolvedBatchLine = Pick<
  StockBatchLine,
  | 'productId'
  | 'productUnitId'
  | 'purchaseUnit'
  | 'purchaseQuantity'
  | 'purchaseUnitCost'
  | 'standardUnit'
  | 'standardQuantity'
  | 'resolvedStandardUnitId'
  | 'expiryDate'
> & {
  stockIncrement: number;
};

/**
 * One product's sealed-stock movement. Sealed stock is counted per product, so
 * the several lines one product contributes to a batch are added up into a
 * single increment rather than incremented line by line.
 */
export type StockIncrement = {
  productId: string;
  amount: number;
};

export type BatchHeader = {
  batchDate: Date;
  supplierName?: string;
  referenceNumber?: string;
};

export type CreateBatchCommand = {
  businessId: string;
  branchId: string;
  memberId: string;
  header: BatchHeader;
  lines: ResolvedBatchLine[];
  stockIncrements: StockIncrement[];
};

/**
 * A line joined with the product label it belongs to. The line stores only
 * `productId`, so the product name is denormalized in for display. The four
 * quantity and cost columns are held as the stored decimals Prisma hands back;
 * the service narrows them to plain numbers.
 */
export type StockBatchLineRecordWithResolvedProduct = StockBatchLineRecord & {
  product: {
    name: string;
    brand: string | null;
  };
};

export type BusinessMemberContext = Pick<BusinessMember, 'id' | 'name' | 'role'>;

export type StockBatchRecord = StockBatch & {
  lines: StockBatchLineRecordWithResolvedProduct[];
  receivedByMember: BusinessMemberContext | null;
};

/**
 * The scope the business module's authorize middleware resolved onto the
 * request by the time a controller runs.
 */
export type BatchActor = {
  businessId: string;
  branchId: string;
  memberId: string;
};

export type BatchScope = {
  businessId: string;
  branchId: string;
};

export type ProductWithStockLinesRecord = Product & {
  productUnits: ProductUnit[];
  stockBatchLines: StockBatchLineRecord[];
};

export type BatchRepository = {
  getProductUnitContext(businessId: string, productIds: string[]): Promise<ProductContext[]>;
  createBatchAndAdjustStock(command: CreateBatchCommand): Promise<StockBatchRecord>;
  listBatches(businessId: string, branchId: string): Promise<StockBatchRecord[]>;
  listProductsWithStockLines(
    businessId: string,
    branchId: string,
  ): Promise<ProductWithStockLinesRecord[]>;
  listProductAttachments(productIds: string[]): Promise<AttachmentRecord[]>;
};

export type BatchService = {
  createBatch(actor: BatchActor, input: CreateBatchInput): Promise<CreateBatchResult>;
  listBatches(scope: BatchScope): Promise<StockBatchDetailResult[]>;
  listProductInventorySummaries(scope: BatchScope): Promise<ProductInventorySummary[]>;
};
