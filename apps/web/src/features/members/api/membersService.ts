import type { BusinessMemberSummaryResponse, MemberListFilters } from '@mez/types';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface MembersApi {
  listMembers(
    businessId: string,
    filters: MemberListFilters,
  ): Promise<BusinessMemberSummaryResponse[]>;
}

function membersPath(businessId: string, filters: MemberListFilters) {
  const query = new URLSearchParams();
  if (filters.role) query.set('role', filters.role);
  const search = query.toString();
  return `/api/businesses/${businessId}/members${search ? `?${search}` : ''}`;
}

export function createMembersService(client: ApiClient): MembersApi {
  return {
    async listMembers(businessId, filters) {
      return client.get<BusinessMemberSummaryResponse[]>(membersPath(businessId, filters));
    },
  };
}

export const membersService = createMembersService(apiClient);
