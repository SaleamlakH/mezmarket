import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateSaleInput } from '@mez/types';
import { catalogKeys } from '@/hooks/useCatalogApi';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { salesService } from '../api/salesService';

export const salesKeys = {
  all: (businessId: string) => ['sales', businessId] as const,
  list: (businessId: string) => [...salesKeys.all(businessId), 'list'] as const,
} as const;

export function useSales() {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey: businessId ? salesKeys.list(businessId) : ['sales', 'list', 'disabled'],
    queryFn: () => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      return salesService.getSales(businessId);
    },
    enabled: Boolean(businessId),
  });
}

export function useCreateSale() {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSaleInput) => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      return salesService.createSale(businessId, input);
    },
    onSuccess: () => {
      if (!businessId) return;
      // The new row belongs at the top of the history, and stock has moved on.
      void queryClient.invalidateQueries({ queryKey: salesKeys.list(businessId) });
      void queryClient.invalidateQueries({ queryKey: catalogKeys.products(businessId) });
    },
  });
}
