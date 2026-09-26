import type { UnitsResponse } from '@mez/types';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface UnitsService {
  listUnits(): Promise<UnitsResponse>;
}

export function createUnitsService(client: ApiClient): UnitsService {
  return {
    async listUnits() {
      return client.get<UnitsResponse>('/api/units');
    },
  };
}

export const unitsService = createUnitsService(apiClient);
