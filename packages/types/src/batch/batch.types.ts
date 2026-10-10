import type { BusinessMemberSummaryResponse } from '../business/business.types.js';
import type { ProductSummary } from '../products/products.types.js';
import type { RequireAllKeys } from '../shared/require-all-keys.js';

/**
 * Domain shape of a StockBatchLine as stored in the database.
 */
export interface StockBatchLine {
  id: string;
  stockBatchId: string;
  productId: string;
  purchaseUnit: string;
  purchaseQuantity: number;
  purchaseUnitCost: number;
  standardUnit: string;
  standardQuantity: number;
  productUnitId: string | null;
  resolvedStandardUnitId: string | null;
  quantityRemaining: number;
  expiryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JSON-serialized form of a StockBatchLine sent to the frontend.
 */
export type StockBatchLineResponse = RequireAllKeys<
  StockBatchLine,
  Omit<StockBatchLine, 'expiryDate' | 'createdAt' | 'updatedAt'> & {
    expiryDate: string | null;
    createdAt: string;
    updatedAt: string;
  }
>;

/**
 * Domain shape of a StockBatch as stored in the database.
 */
export interface StockBatch {
  id: string;
  businessId: string;
  branchId: string;
  supplierName: string | null;
  referenceNumber: string | null;
  batchDate: Date;
  confirmedAt: Date | null;
  receivedByMemberId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JSON-serialized form of a StockBatch sent to the frontend.
 *
 * `confirmedAt` is serialized as a required string because a recorded batch
 * is always confirmed.
 */
export type StockBatchResponse = RequireAllKeys<
  StockBatch,
  Omit<StockBatch, 'batchDate' | 'confirmedAt' | 'createdAt' | 'updatedAt'> & {
    batchDate: string;
    confirmedAt: string;
    createdAt: string;
    updatedAt: string;
  }
>;

/**
 * A batch line joined with the product label it belongs to. The line stores
 * only `productId`, so the product name is denormalized into the payload
 * for display.
 */
export type StockBatchLineDetailResponse = StockBatchLineResponse & {
  productName: string;
  productBrand: string | null;
};

/**
 * Return shape of a batch detail request, and of the add/edit batch
 * endpoints so a freshly written batch reads back the same way.
 */
export type StockBatchDetailResponse = StockBatchResponse & {
  lines: StockBatchLineDetailResponse[];
  receivedBy: BusinessMemberSummaryResponse | null;
};

/**
 * Which side of its low-stock threshold a product's on-hand stock falls.
 */
export type StockStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';

/**
 * Summarized inventory information for a product. Quantities are expressed in
 * the product's Base Unit unless stated otherwise.
 */
export type ProductInventorySummary = ProductSummary & {
  currentSealedStock: number;
  baseUnitLabel: string;
  totalCost: number;
  earliestExpiry: Date | null;
  expiryCount: number;
  numberOfBatches: number;
  stockStatus: StockStatus;
};

/**
 * JSON-serialized inventory summary sent to the frontend. Dates are serialized
 * to ISO 8601 strings.
 */
export type ProductInventorySummaryResponse = RequireAllKeys<
  ProductInventorySummary,
  Omit<ProductInventorySummary, 'createdAt' | 'updatedAt' | 'earliestExpiry'> & {
    createdAt: string;
    updatedAt: string;
    earliestExpiry: string | null;
  }
>;

/**
 * One batch line as the product inventory history reads it: the line's own
 * purchase figures, without the parent batch it is grouped under.
 */
export type ProductInventoryBatchLine = Pick<
  StockBatchLine,
  | 'id'
  | 'purchaseQuantity'
  | 'purchaseUnit'
  | 'purchaseUnitCost'
  | 'standardQuantity'
  | 'standardUnit'
  | 'quantityRemaining'
  | 'expiryDate'
>;

/**
 * JSON-serialized form sent to the frontend.
 */
export type ProductInventoryBatchLineResponse = RequireAllKeys<
  ProductInventoryBatchLine,
  Omit<ProductInventoryBatchLine, 'expiryDate'> & {
    expiryDate: string | null;
  }
>;

/**
 * One batch a product appeared in: the header the history can link back by,
 * plus that product's lines in it. Other products in the batch are excluded.
 */
export type ProductInventoryBatch = Pick<
  StockBatch,
  'id' | 'batchDate' | 'supplierName' | 'referenceNumber'
> & {
  lines: ProductInventoryBatchLine[];
};

/**
 * JSON-serialized form sent to the frontend.
 */
export type ProductInventoryBatchResponse = RequireAllKeys<
  ProductInventoryBatch,
  Omit<ProductInventoryBatch, 'batchDate' | 'lines'> & {
    batchDate: string;
    lines: ProductInventoryBatchLineResponse[];
  }
>;

/**
 * A product's inventory detail: its stock summary, plus every batch it
 * appeared in, newest batch first, each carrying that product's lines.
 */
export type ProductInventoryDetail = ProductInventorySummary & {
  batches: ProductInventoryBatch[];
};

/**
 * JSON-serialized form sent to the frontend.
 */
export type ProductInventoryDetailResponse = RequireAllKeys<
  ProductInventoryDetail,
  Omit<ProductInventoryDetail, 'earliestExpiry' | 'batches'> & {
    earliestExpiry: string | null;
    batches: ProductInventoryBatchResponse[];
  }
>;

/**
 * Response aliases for create and update operations.
 */
export type CreateBatchResponse = StockBatchDetailResponse;
export type UpdateBatchResponse = StockBatchDetailResponse;

/**
 * A batch line joined with product labels, using domain Date types.
 */
export type StockBatchLineDetailResult = StockBatchLine & {
  productName: string;
  productBrand: string | null;
};

/**
 * Domain result shape returned by fetch, create, and update operations.
 * Dates are retained as `Date` instances (not serialized to strings).
 */
export type StockBatchDetailResult = StockBatch & {
  lines: StockBatchLineDetailResult[];
  receivedBy: BusinessMemberSummaryResponse | null;
};

/**
 * API result type for creating a stock batch (domain shape).
 */
export type CreateBatchResult = StockBatchDetailResult;

/**
 * API result type for updating a stock batch (domain shape).
 */
export type UpdateBatchResult = StockBatchDetailResult;

/**
 * A batch line as submitted. `productUnitId` identifies the purchasable
 * unit the stock was bought in — the unit label and its standard-unit
 * equivalent are resolved server-side, never typed in by the user.
 */
export type CreateBatchLineInput = Pick<
  StockBatchLine,
  'productId' | 'purchaseQuantity' | 'purchaseUnitCost'
> & {
  productUnitId: string;
  expiryDate?: Date;
};

/**
 * Request payload for recording a batch and its lines.
 *
 * An omitted optional field means the batch has no value for it; the whole
 * header is replaced on edit, so omitting one clears it.
 */
export interface CreateBatchInput {
  /** ISO 8601 instant the batch was received on. */
  batchDate: Date;
  supplierName?: string;
  referenceNumber?: string;
  lines: CreateBatchLineInput[];
}

/**
 * A batch line as submitted when editing a recorded batch. An `id` updates
 * that existing line in place; a line without one is inserted. Existing
 * lines left out of the payload are removed.
 */
export type UpdateBatchLineInput = CreateBatchLineInput & {
  id?: string;
};

/**
 * Request payload for editing a recorded batch. Lines are updated in
 * place, never replaced wholesale.
 */
export type UpdateBatchInput = Omit<CreateBatchInput, 'lines'> & {
  /** ISO 8601 instant the batch was received on. */
  lines: UpdateBatchLineInput[];
};

/**
 * Raw values a line row holds before validation: every field is text, which
 * is what an input hands over. An optional field reads as `undefined` while
 * it is untouched, which is why these types — and only these — say so.
 */
export type BatchLineFormValues = Omit<
  CreateBatchLineInput,
  'purchaseQuantity' | 'purchaseUnitCost' | 'expiryDate'
> & {
  purchaseQuantity: string;
  purchaseUnitCost: string;
  /** UTC ISO 8601 instant, as a date picker produces. */
  expiryDate?: string | undefined;
};

/**
 * Raw values the add-batch form holds before validation.
 */
export type BatchFormValues = Omit<
  CreateBatchInput,
  'batchDate' | 'supplierName' | 'referenceNumber' | 'lines'
> & {
  /** UTC ISO 8601 instant, as a date picker produces. */
  batchDate: string;
  supplierName?: string | undefined;
  referenceNumber?: string | undefined;
  lines: BatchLineFormValues[];
};

/**
 * A line row in the edit form additionally carries the id of the line it
 * updates; a row without one is a newly added line.
 */
export type UpdateBatchLineFormValues = BatchLineFormValues & {
  id?: string | undefined;
};

/**
 * Raw values the edit-batch form holds before validation.
 */
export type UpdateBatchFormValues = Omit<BatchFormValues, 'lines'> & {
  lines: UpdateBatchLineFormValues[];
};
