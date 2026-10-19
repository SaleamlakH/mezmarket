import type {
  CreateBatchInput,
  ProductInventoryDetailResponse,
  ProductInventorySummaryResponse,
  StockBatchDetailResponse,
} from '@mez/types';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface InventoryApi {
  getBatches(businessId: string): Promise<StockBatchDetailResponse[]>;
  getBatch(businessId: string, batchId: string): Promise<StockBatchDetailResponse>;
  getInventoryProducts(
    businessId: string,
    expiryBefore?: Date,
  ): Promise<ProductInventorySummaryResponse[]>;
  getInventoryProduct(
    businessId: string,
    productId: string,
    expiryBefore?: Date,
  ): Promise<ProductInventoryDetailResponse>;
  createBatch(businessId: string, input: CreateBatchInput): Promise<StockBatchDetailResponse>;
}

/** Appends only the parameters the caller actually set. */
function withQuery(path: string, params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );

  if (entries.length === 0) return path;

  return `${path}?${new URLSearchParams(entries).toString()}`;
}

export function createInventoryService(client: ApiClient): InventoryApi {
  return {
    getBatches(businessId) {
      return client.get<StockBatchDetailResponse[]>(
        `/api/businesses/${businessId}/inventory/batches`,
      );
    },
    getBatch(businessId, batchId) {
      return client.get<StockBatchDetailResponse>(
        `/api/businesses/${businessId}/inventory/batches/${batchId}`,
      );
    },
    getInventoryProducts(businessId, expiryBefore) {
      return client.get<ProductInventorySummaryResponse[]>(
        withQuery(`/api/businesses/${businessId}/inventory/products`, {
          expiryBefore: expiryBefore?.toISOString(),
        }),
      );
    },
    getInventoryProduct(businessId, productId, expiryBefore) {
      return client.get<ProductInventoryDetailResponse>(
        withQuery(`/api/businesses/${businessId}/inventory/products/${productId}`, {
          expiryBefore: expiryBefore?.toISOString(),
        }),
      );
    },
    createBatch(businessId, input) {
      return client.post<StockBatchDetailResponse>(
        `/api/businesses/${businessId}/inventory/batches`,
        input,
      );
    },
  };
}

export const inventoryService = createInventoryService(apiClient);
