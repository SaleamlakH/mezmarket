import { useQuery } from '@tanstack/react-query';
import type { MemberListFilters } from '@mez/types';
import { referenceQueryPolicy } from '@/lib/queryPolicy';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useMembersService } from '@/providers/members/useMembersService';

export const membersKeys = {
  all: (businessId: string) => ['members', businessId] as const,
  list: (businessId: string, filters: MemberListFilters) =>
    [...membersKeys.all(businessId), 'list', filters] as const,
} as const;

/** The members of one business, narrowed by `filters`; fetched only when the picker is open. */
export function useMembers(
  filters: MemberListFilters,
  options?: { enabled?: boolean | undefined },
) {
  const { currentBusiness } = useBusinessContext();
  const membersService = useMembersService();
  const businessId = currentBusiness?.id;
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: businessId ? membersKeys.list(businessId, filters) : ['members', 'list', 'disabled'],
    queryFn: () => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      return membersService.listMembers(businessId, filters);
    },
    enabled: Boolean(businessId) && enabled,
    ...referenceQueryPolicy,
  });
}
