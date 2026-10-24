import type {
  BusinessMemberSummaryResponse,
  MemberListFilters,
  MemberPerformanceResponse,
  ReportingPeriodQueryFilters,
} from '@mez/types';

import type { BusinessMember } from '../../../generated/prisma/client.js';

import type { StoredDecimal } from '../../shared/types/decimal.types.js';
import type { Actor, Scope } from '../../shared/types/session.types.js';

export type { BusinessMemberSummaryResponse, MemberListFilters } from '@mez/types';

/**
 * The window and member a performance read covers. The branch always comes from
 * the session, so a read can never cross into another branch.
 */
export type MemberPerformanceRead = {
  branchId: string;
  memberId: string;
  from: Date;
  to: Date;
};

/** The member's period sales: the summed total and the number of sale rows. */
export type MemberSalesAggregate = {
  total: StoredDecimal | null;
  count: number;
};

export type MembersRepository = {
  /** The business's active members, optionally narrowed to one role, by name. */
  list(businessId: string, branchId: string, filters: MemberListFilters): Promise<BusinessMember[]>;

  /** One member by id inside the resolved business and branch, active or not. */
  getMember(businessId: string, branchId: string, memberId: string): Promise<BusinessMember | null>;

  /** The member's non-voided period sales, whether processed or served. */
  memberSalesAggregate(read: MemberPerformanceRead): Promise<MemberSalesAggregate>;

  /** The cash the member recorded in the period, from non-voided branch sales. */
  memberCashAggregate(read: MemberPerformanceRead): Promise<StoredDecimal | null>;

  /** How many of the member's period sales still owe money. */
  memberUnpaidCount(read: MemberPerformanceRead): Promise<number>;
};

export type MembersService = {
  /** The members as picker summaries, by name. */
  list(scope: Scope, filters: MemberListFilters): Promise<BusinessMemberSummaryResponse[]>;

  /** One member's sales, recorded cash and unpaid-sale count over a period. */
  getPerformance(
    actor: Actor,
    memberId: string,
    period: ReportingPeriodQueryFilters,
  ): Promise<MemberPerformanceResponse>;
};
