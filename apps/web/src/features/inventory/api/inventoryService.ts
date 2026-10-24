import type {
  CreateBatchInput,
  ProductInventoryDetailResponse,
  ProductInventoryListFilters,
  ProductInventorySummaryResponse,
  StockBatchDetailResponse,
} from '@mez/types';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface InventoryApi {
  getBatches(businessId: string): Promise<StockBatchDetailResponse[]>;
  getBatch(businessId: string, batchId: string): Promise<StockBatchDetailResponse>;
  getInventoryProducts(
    businessId: string,
    filters?: ProductInventoryListFilters,
  ): Promise<ProductInventorySummaryResponse[]>;
  getInventoryProduct(
    businessId: string,
    productId: string,
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

/** The lowercase CSV spelling the API reads for an enum list. */
function csvParam(values: readonly string[] | undefined): string | undefined {
  return values && values.length > 0
    ? values.map((value) => value.toLowerCase()).join(',')
    : undefined;
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
    getInventoryProducts(businessId, filters) {
      return client.get<ProductInventorySummaryResponse[]>(
        withQuery(`/api/businesses/${businessId}/inventory/products`, {
          expiryBefore: filters?.expiryBefore?.toISOString(),
          status: filters?.status,
          stockStatus: csvParam(filters?.stockStatus),
          expiryStatus: csvParam(filters?.expiryStatus),
        }),
      );
    },
    getInventoryProduct(businessId, productId) {
      return client.get<ProductInventoryDetailResponse>(
        `/api/businesses/${businessId}/inventory/products/${productId}`,
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
