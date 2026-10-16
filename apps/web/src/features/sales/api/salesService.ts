import type {
  CreateSaleInput,
  CreateSaleResponse,
  RecordPaymentInput,
  SaleDetailResponse,
  SaleSummaryResponse,
} from '@mez/types';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface SalesApi {
  getSales(businessId: string): Promise<SaleSummaryResponse[]>;
  getSale(businessId: string, saleId: string): Promise<SaleDetailResponse>;
  createSale(businessId: string, input: CreateSaleInput): Promise<CreateSaleResponse>;
  recordPayment(
    businessId: string,
    saleId: string,
    input: RecordPaymentInput,
  ): Promise<SaleDetailResponse>;
}

export function createSalesService(client: ApiClient): SalesApi {
  return {
    getSales(businessId) {
      return client.get<SaleSummaryResponse[]>(`/api/businesses/${businessId}/sales`);
    },

    getSale(businessId, saleId) {
      return client.get<SaleDetailResponse>(`/api/businesses/${businessId}/sales/${saleId}`);
    },

    createSale(businessId, input) {
      return client.post<CreateSaleResponse>(`/api/businesses/${businessId}/sales`, input);
    },

    recordPayment(businessId, saleId, input) {
      return client.post<SaleDetailResponse>(
        `/api/businesses/${businessId}/sales/${saleId}/payments`,
        input,
      );
    },
  };
}

export const salesService = createSalesService(apiClient);
