import type { BusinessMember } from '@mez/types';

/**
 * The scope the authorize middleware resolved onto the request by the time a
 * controller runs.
 */
export type Actor = {
  businessId: string;
  branchId: string;
  memberId: string;
};

/** The business/branch a request operates within. */
export type Scope = {
  businessId: string;
  branchId: string;
};

/**
 * A member trimmed to the fields a response embeds, so a payload can name its
 * actor without shipping the whole member record.
 */
export type MemberSummary = Pick<BusinessMember, 'id' | 'name' | 'role'>;
