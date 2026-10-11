import type { CreateSaleInput, CreateSaleResponse, SaleSummaryResponse } from '@mez/types';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface SalesApi {
  getSales(businessId: string): Promise<SaleSummaryResponse[]>;
  createSale(businessId: string, input: CreateSaleInput): Promise<CreateSaleResponse>;
}

export function createSalesService(client: ApiClient): SalesApi {
  return {
    getSales(businessId) {
      return client.get<SaleSummaryResponse[]>(`/api/businesses/${businessId}/sales`);
    },

    createSale(businessId, input) {
      return client.post<CreateSaleResponse>(`/api/businesses/${businessId}/sales`, input);
    },
  };
}

export const salesService = createSalesService(apiClient);
