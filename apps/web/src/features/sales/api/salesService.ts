import type {
  CreateSaleInput,
  CreateSaleResponse,
  RecordPaymentInput,
  SaleDetailResponse,
  SaleListFilters,
  SaleSummaryResponse,
} from '@mez/types';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface SalesApi {
  getSales(businessId: string, filters?: SaleListFilters): Promise<SaleSummaryResponse[]>;
  getSale(businessId: string, saleId: string): Promise<SaleDetailResponse>;
  createSale(businessId: string, input: CreateSaleInput): Promise<CreateSaleResponse>;
  recordPayment(
    businessId: string,
    saleId: string,
    input: RecordPaymentInput,
  ): Promise<SaleDetailResponse>;
}

/** Appends only the filter parameters the caller actually set. */
function salesPath(businessId: string, filters: SaleListFilters): string {
  const params = new URLSearchParams();

  if (filters.status !== undefined) params.set('status', filters.status);
  if (filters.from !== undefined) params.set('from', filters.from);
  if (filters.to !== undefined) params.set('to', filters.to);
  if (filters.productId !== undefined) params.set('productId', filters.productId);
  if (filters.unpaid !== undefined) params.set('unpaid', String(filters.unpaid));
  if (filters.overdue !== undefined) params.set('overdue', String(filters.overdue));

  const search = params.toString();
  return `/api/businesses/${businessId}/sales${search ? `?${search}` : ''}`;
}

export function createSalesService(client: ApiClient): SalesApi {
  return {
    getSales(businessId, filters = {}) {
      return client.get<SaleSummaryResponse[]>(salesPath(businessId, filters));
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
