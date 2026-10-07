import type {
  CreateBatchInput,
  ProductInventorySummaryResponse,
  ProductSummaryResponse,
  ProductUnitOptionResponse,
  StockBatchDetailResponse,
} from '@mez/types';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface InventoryApi {
  getBatches(businessId: string): Promise<StockBatchDetailResponse[]>;
  getInventoryProducts(businessId: string): Promise<ProductInventorySummaryResponse[]>;
  createBatch(businessId: string, input: CreateBatchInput): Promise<StockBatchDetailResponse>;
  getProducts(businessId: string): Promise<ProductSummaryResponse[]>;
  getProductUnits(businessId: string, productId: string): Promise<ProductUnitOptionResponse[]>;
}

export function createInventoryService(client: ApiClient): InventoryApi {
  return {
    getBatches(businessId) {
      return client.get<StockBatchDetailResponse[]>(
        `/api/businesses/${businessId}/inventory/batches`,
      );
    },
    getInventoryProducts(businessId) {
      return client.get<ProductInventorySummaryResponse[]>(
        `/api/businesses/${businessId}/inventory/products`,
      );
    },
    createBatch(businessId, input) {
      return client.post<StockBatchDetailResponse>(
        `/api/businesses/${businessId}/inventory/batches`,
        input,
      );
    },
    getProducts(businessId) {
      return client.get<ProductSummaryResponse[]>(`/api/businesses/${businessId}/products`);
    },
    getProductUnits(businessId, productId) {
      return client.get<ProductUnitOptionResponse[]>(
        `/api/businesses/${businessId}/products/${productId}/units`,
      );
    },
  };
}

export const inventoryService = createInventoryService(apiClient);
