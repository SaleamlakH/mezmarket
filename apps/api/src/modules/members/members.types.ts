import type { BusinessMemberSummaryResponse, MemberListFilters } from '@mez/types';

import type { BusinessMember } from '../../../generated/prisma/client.js';
import type { Scope } from '../../shared/types/session.types.js';

export type { BusinessMemberSummaryResponse, MemberListFilters } from '@mez/types';

export type MembersRepository = {
  /** The business's active members, optionally narrowed to one role, by name. */
  list(businessId: string, branchId: string, filters: MemberListFilters): Promise<BusinessMember[]>;
};

export type MembersService = {
  /** The members as picker summaries, by name. */
  list(scope: Scope, filters: MemberListFilters): Promise<BusinessMemberSummaryResponse[]>;
};
