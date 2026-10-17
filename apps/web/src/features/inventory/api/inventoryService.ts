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
  getInventoryProducts(businessId: string): Promise<ProductInventorySummaryResponse[]>;
  getInventoryProduct(
    businessId: string,
    productId: string,
  ): Promise<ProductInventoryDetailResponse>;
  createBatch(businessId: string, input: CreateBatchInput): Promise<StockBatchDetailResponse>;
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
    getInventoryProducts(businessId) {
      return client.get<ProductInventorySummaryResponse[]>(
        `/api/businesses/${businessId}/inventory/products`,
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
