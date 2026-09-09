import type { BusinessResponse, CreateBusinessResponse } from '@mez/types';
import type { BusinessService } from '@/providers/business/types';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface BusinessListResponse {
  businesses: BusinessResponse[];
}

export function createBusinessService(client: ApiClient): BusinessService {
  return {
    async listBusinesses() {
      const response = await client.get<BusinessListResponse>('/api/businesses');
      return response.businesses;
    },
    async createBusiness(input) {
      return client.post<CreateBusinessResponse>('/api/businesses', input);
    },
  };
}

export const businessService = createBusinessService(apiClient);
