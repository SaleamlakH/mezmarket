import type {
  CreateCustomerInput,
  CreateCustomerResponse,
  CustomerSummaryResponse,
} from '@mez/types';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface CustomersApi {
  listCustomers(businessId: string): Promise<CustomerSummaryResponse[]>;
  createCustomer(businessId: string, input: CreateCustomerInput): Promise<CreateCustomerResponse>;
}

export function createCustomersService(client: ApiClient): CustomersApi {
  return {
    async listCustomers(businessId) {
      return client.get<CustomerSummaryResponse[]>(`/api/businesses/${businessId}/customers`);
    },

    async createCustomer(businessId, input) {
      return client.post<CreateCustomerResponse>(`/api/businesses/${businessId}/customers`, input);
    },
  };
}

export const customersService = createCustomersService(apiClient);
