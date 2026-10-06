import type {
  BatchFormValues,
  BusinessMemberSummaryResponse,
  ProductInventorySummaryResponse,
  ProductSummaryResponse,
} from '@mez/types';

/**
 * Marks whether a product has a photo, so the views can lay out for one
 * before any media is served.
 *
 * `photoUrl` lives on the full `Product` but not on the summary the
 * inventory list endpoint returns, so until it is carried there, the views
 * hold this flag rather than a URL that would not resolve.
 */
type WithPhoto<T> = T & { hasPhoto: boolean };

/** A product as the stock list presents it: the shared inventory summary. */
export type InventoryProductView = WithPhoto<ProductInventorySummaryResponse>;

/** A product as a picker row presents it: the shared picker summary. */
export type ProductSummaryView = WithPhoto<ProductSummaryResponse>;

/** One product line of a batch, flattened for the batch card's preview. */
export interface BatchProductPreview {
  name: string;
  quantity: number;
  purchaseUnit: string;
}

/**
 * A batch as the batch list presents it.
 *
 * A batch has no title of its own, so its date leads the card and its
 * product lines are previews: the first two are listed and anything beyond
 * that collapses into a `+N` count.
 *
 * `@mez/types` has no batch-list contract yet, so this stays local until the
 * endpoint that returns one lands. The field names already line up with
 * `StockBatchDetailResponse`.
 */
export interface BatchSummary {
  id: string;
  /** ISO 8601 instant the batch was received on. */
  batchDate: string;
  supplierName: string | null;
  referenceNumber: string | null;
  receivedBy: BusinessMemberSummaryResponse | null;
  lineCount: number;
  totalAmount: number;
  products: BatchProductPreview[];
}

/**
 * The batch's own fields, as raw text the header form holds. This is
 * `BatchFormValues` without its lines: the draft keeps the header and the
 * lines apart so a line can be edited without touching the header.
 */
export type BatchDraftHeader = Omit<BatchFormValues, 'lines'>;
