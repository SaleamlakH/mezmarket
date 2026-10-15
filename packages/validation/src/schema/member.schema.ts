import type { ZodType } from 'zod';
import z from 'zod';
import type { BusinessMemberRole, MemberListFilters } from '@mez/types';

/**
 * Mirrors `BusinessMemberRole` in @mez/types, so the two cannot drift. Exported
 * for the pickers that offer a role filter.
 */
export const BUSINESS_MEMBER_ROLES = [
  'OWNER',
  'MANAGER',
  'CASHIER',
  'SERVER',
] as const satisfies readonly BusinessMemberRole[];

const roleError = 'Invalid member role';

/**
 * Filters a member-list request may carry. An absent or blank `role` is no
 * filter; a present one is upper-cased before it is checked, so a caller may
 * send the role in any case.
 */
export const memberListQuerySchema = z.object({
  role: z
    .string({ error: roleError })
    .trim()
    .transform((value) => (value === '' ? undefined : (value.toUpperCase() as BusinessMemberRole)))
    .optional()
    .pipe(z.enum(BUSINESS_MEMBER_ROLES, { error: roleError }).optional()),
}) satisfies ZodType<MemberListFilters>;
