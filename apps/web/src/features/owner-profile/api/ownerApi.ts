import type { OwnerResponse, UpdateOwnerInput } from '@mez/types';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export type OwnerApi = {
  getOwnerProfile(): Promise<OwnerResponse>;
  updateOwnerProfile(data: UpdateOwnerInput): Promise<OwnerResponse>;
};

export function createOwnerApi(client: ApiClient): OwnerApi {
  return {
    async getOwnerProfile() {
      return client.get<OwnerResponse>('/api/owner');
    },

    async updateOwnerProfile(data: UpdateOwnerInput) {
      return client.put<OwnerResponse>('/api/owner', data);
    },
  };
}

export const ownerApi = createOwnerApi(apiClient);
