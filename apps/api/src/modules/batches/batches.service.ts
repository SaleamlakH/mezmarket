import type {
  BatchRepository,
  BatchService,
  CreateBatchCommand,
  CreateBatchInput,
  ProductInventoryDetailFilters,
  ProductInventoryListFilters,
} from './batches.types.js';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import type { Actor, Scope } from '../../shared/types/session.types.js';
import { snapshotBatchLines } from './utils/snapshot.js';
import { sumStockByProduct } from './utils/stock.js';
import { toBatchDetail, toProductBatches } from './utils/mappers.js';
import {
  baseUnitOf,
  buildProductInventoryStock,
  expiryTotalsOf,
  toProductInventorySummary,
} from './utils/inventory.js';

export function createBatchService(repository: BatchRepository): BatchService {
  return {
    async createBatch(actor: Actor, input: CreateBatchInput) {
      const productIds = [...new Set(input.lines.map((line) => line.productId))];
      const products = await repository.getProductUnitContext(actor.businessId, productIds);
      const lines = snapshotBatchLines(products, actor.businessId, input.lines);

      const command: CreateBatchCommand = {
        businessId: actor.businessId,
        branchId: actor.branchId,
        memberId: actor.memberId,
        header: {
          batchDate: input.batchDate,
          ...(input.supplierName !== undefined && { supplierName: input.supplierName }),
          ...(input.referenceNumber !== undefined && { referenceNumber: input.referenceNumber }),
        },
        lines,
        stockIncrements: sumStockByProduct(lines),
      };

      const createBatchResult = await repository.createBatchAndAdjustStock(command);
      return toBatchDetail(createBatchResult);
    },

    async listBatches({ businessId, branchId }: Scope) {
      const records = await repository.listBatches(businessId, branchId);
      return records.map(toBatchDetail);
    },

    async getBatchDetail({ businessId, branchId }: Scope, batchId: string) {
      const record = await repository.getBatchDetail(businessId, branchId, batchId);

      if (!record) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Batch not found', 404);
      }

      return toBatchDetail(record);
    },

    async listProductInventorySummaries(
      { businessId, branchId }: Scope,
      filters: ProductInventoryListFilters,
    ) {
      const records = await repository.listProductsWithStockLines(businessId, branchId);

      if (records.length === 0) return [];

      const attachments = await repository.listProductAttachments(
        records.map((record) => record.id),
      );

      const uploadIds = new Map(
        attachments
          .filter((attachment) => attachment.uploadId != null)
          .map((attachment) => [attachment.recordId, attachment.uploadId]),
      );

      const expiryBefore = filters.expiryBefore ?? new Date();

      return records.map((record) => toProductInventorySummary(record, uploadIds, expiryBefore));
    },

    async getProductInventoryDetail(
      { businessId, branchId }: Scope,
      productId: string,
      filters: ProductInventoryDetailFilters,
    ) {
      const record = await repository.getProductWithBatchHistory(businessId, branchId, productId);

      if (!record) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404);
      }

      const attachments = await repository.listProductAttachments([record.id]);
      const uploadId =
        attachments.find((attachment) => attachment.uploadId != null)?.uploadId ?? null;

      // The header figures read the lines still holding stock, the same way the
      // product list does; the history below lists every batch it appeared in.
      const remainingLines = record.stockBatchLines.filter(
        (line) => line.quantityRemaining.toNumber() > 0,
      );
      const baseUnit = baseUnitOf(record);
      const expiryBefore = filters.expiryBefore ?? new Date();

      return {
        ...buildProductInventoryStock(record, remainingLines, uploadId),
        expiry: expiryTotalsOf(remainingLines, expiryBefore),
        batches: toProductBatches(record.stockBatchLines, record.productUnits, baseUnit.name),
      };
    },
  };
}
