import type { BusinessResponse, CreateBusinessResponse } from '@mez/types';
import type { BusinessService } from '@/providers/business/types';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface BusinessListResponse {
  businesses: BusinessResponse[];
}

export interface BusinessDetailResponse {
  business: BusinessResponse;
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
    async getBusiness(businessId) {
      const response = await client.get<BusinessDetailResponse>(`/api/businesses/${businessId}`);
      return response.business;
    },
    async updateBusiness(businessId, input) {
      const response = await client.put<BusinessDetailResponse>(
        `/api/businesses/${businessId}`,
        input,
      );
      return response.business;
    },
  };
}

export const businessService = createBusinessService(apiClient);
