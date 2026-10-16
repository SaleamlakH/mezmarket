import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { referenceQueryPolicy } from '@/lib/queryPolicy';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCustomersService } from '@/providers/customers/useCustomersService';

export const customersKeys = {
  all: (businessId: string) => ['customers', businessId] as const,
  list: (businessId: string) => [...customersKeys.all(businessId), 'list'] as const,
} as const;

/** The picker's list, fetched only while the picker is open. */
export function useCustomers(options?: { enabled?: boolean | undefined }) {
  const { currentBusiness } = useBusinessContext();
  const customersService = useCustomersService();
  const businessId = currentBusiness?.id;
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: businessId ? customersKeys.list(businessId) : ['customers', 'list', 'disabled'],
    queryFn: () => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      return customersService.listCustomers(businessId);
    },
    enabled: Boolean(businessId) && enabled,
    ...referenceQueryPolicy,
  });
}

/** Saves a customer typed into the picker and refreshes the list it came from. */
export function useCreateCustomer() {
  const { currentBusiness } = useBusinessContext();
  const customersService = useCustomersService();
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof customersService.createCustomer>[1]) => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      return customersService.createCustomer(businessId, input);
    },
    onSuccess: () => {
      if (!businessId) return;
      void queryClient.invalidateQueries({ queryKey: customersKeys.list(businessId) });
    },
  });
}
