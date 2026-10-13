import type {
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
} from '../../../generated/prisma/client.js';

import type { ProductUnitContext } from '../../shared/types/unit.types.js';
import type { Actor, MemberSummary, Scope } from '../../shared/types/session.types.js';

export type {
  CreateBatchInput,
  CreateBatchLineInput,
  CreateBatchResult,
  ProductInventorySummary,
  StockBatchDetailResult,
  StockStatus,
  UnitRole,
};

export type { ProductUnitContext };

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

export type StockBatchRecord = StockBatch & {
  lines: StockBatchLineRecordWithResolvedProduct[];
  receivedByMember: MemberSummary | null;
};

export type ProductWithStockLinesRecord = Product & {
  productUnits: ProductUnitContext[];
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
  createBatch(actor: Actor, input: CreateBatchInput): Promise<CreateBatchResult>;
  listBatches(scope: Scope): Promise<StockBatchDetailResult[]>;
  listProductInventorySummaries(scope: Scope): Promise<ProductInventorySummary[]>;
};
