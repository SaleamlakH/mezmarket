import type { ReactNode } from 'react';
import type { BusinessMemberSummaryResponse, MemberListFilters } from '@mez/types';

/** Member list by role filter, ported so the sale flow needs no members feature import. */
export interface MembersService {
  listMembers(
    businessId: string,
    filters: MemberListFilters,
  ): Promise<BusinessMemberSummaryResponse[]>;
}

export interface MembersProviderProps {
  membersService: MembersService;
  children: ReactNode;
}
