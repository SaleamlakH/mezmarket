import { remainingCostOf, remainingPurchaseQuantityOf } from './totals.js';
import type {
  ProductInventoryBatch,
  ProductUnitContext,
  StockBatchLineWithBatchRecord,
  StockBatchRecord,
} from '../batches.types.js';

/** Stored decimals narrowed to numbers, and the product label flattened onto each line. */
export function toBatchDetail(record: StockBatchRecord) {
  const { lines, receivedByMember, ...batch } = record;

  return {
    ...batch,
    lines: lines.map(
      ({
        product,
        purchaseQuantity,
        purchaseUnitCost,
        standardQuantity,
        quantityRemaining,
        ...line
      }) => ({
        ...line,
        purchaseQuantity: purchaseQuantity.toNumber(),
        purchaseUnitCost: purchaseUnitCost.toNumber(),
        standardQuantity: standardQuantity.toNumber(),
        quantityRemaining: quantityRemaining.toNumber(),
        productName: product.name,
        productBrand: product.brand,
      }),
    ),
    receivedBy: receivedByMember,
  };
}

/**
 * Groups the product's lines under the batch that recorded them, newest batch
 * first. A batch keeps every line the product had in it, whether or not any
 * stock is left, so the purchase history is complete.
 */
export function toProductBatches(
  lines: StockBatchLineWithBatchRecord[],
  productUnits: ProductUnitContext[],
  baseUnitLabel: string,
): ProductInventoryBatch[] {
  const batches = new Map<string, ProductInventoryBatch>();

  for (const line of lines) {
    const { stockBatch } = line;

    let batch = batches.get(stockBatch.id);

    if (!batch) {
      batch = {
        id: stockBatch.id,
        batchDate: stockBatch.batchDate,
        supplierName: stockBatch.supplierName,
        referenceNumber: stockBatch.referenceNumber,
        lines: [],
      };
      batches.set(stockBatch.id, batch);
    }

    batch.lines.push({
      id: line.id,
      purchaseQuantity: line.purchaseQuantity.toNumber(),
      purchaseUnit: line.purchaseUnit,
      purchaseUnitCost: line.purchaseUnitCost.toNumber(),
      standardQuantity: line.standardQuantity.toNumber(),
      standardUnit: line.standardUnit,
      quantityRemaining: line.quantityRemaining.toNumber(),
      baseUnit: baseUnitLabel,
      remainingPurchaseQuantity: remainingPurchaseQuantityOf(line, productUnits),
      remainingCost: remainingCostOf(line, productUnits),
      expiryDate: line.expiryDate,
    });
  }

  return [...batches.values()].sort((a, b) => b.batchDate.getTime() - a.batchDate.getTime());
}
