import type { ProductInventoryBatchLineResponse, ProductInventoryBatchResponse } from '@mez/types';

/**
 * One line of a product's history with the batch it came from flattened onto
 * it, so a list can render the line and link back to its batch without walking
 * the groups itself.
 */
export interface ProductBatchLineRow {
  line: ProductInventoryBatchLineResponse;
  batchId: string;
  batchDate: string;
  referenceNumber: string | null;
}

/**
 * Flattens a product's batches into one row per line, keeping the order the
 * API returned: batches newest first, lines in the order they were recorded.
 * No reordering happens here — a future `order` query on the endpoint will
 * decide how the rows are sequenced.
 */
export function flattenProductBatchLines(
  batches: readonly ProductInventoryBatchResponse[],
): ProductBatchLineRow[] {
  return batches.flatMap((batch) =>
    batch.lines.map((line) => ({
      line,
      batchId: batch.id,
      batchDate: batch.batchDate,
      referenceNumber: batch.referenceNumber,
    })),
  );
}
