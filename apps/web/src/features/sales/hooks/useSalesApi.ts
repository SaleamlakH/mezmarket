import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateSaleInput, RecordPaymentInput } from '@mez/types';
import { catalogKeys } from '@/hooks/useCatalogApi';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { salesService } from '../api/salesService';

export const salesKeys = {
  all: (businessId: string) => ['sales', businessId] as const,
  list: (businessId: string) => [...salesKeys.all(businessId), 'list'] as const,
  detail: (businessId: string, saleId: string) =>
    [...salesKeys.all(businessId), 'detail', saleId] as const,
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

export function useSaleDetail(saleId: string | undefined) {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey:
      businessId && saleId ? salesKeys.detail(businessId, saleId) : ['sales', 'detail', 'disabled'],
    queryFn: () => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      if (!saleId) {
        throw new Error('No sale selected');
      }
      return salesService.getSale(businessId, saleId);
    },
    enabled: Boolean(businessId && saleId),
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

/** Records a payment and refreshes the sale detail and history list. */
export function useRecordPayment(saleId: string | undefined) {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecordPaymentInput) => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      if (!saleId) {
        throw new Error('No sale selected');
      }
      return salesService.recordPayment(businessId, saleId, input);
    },
    onSuccess: () => {
      if (!businessId) return;
      void queryClient.invalidateQueries({ queryKey: salesKeys.list(businessId) });
      if (saleId) {
        void queryClient.invalidateQueries({ queryKey: salesKeys.detail(businessId, saleId) });
      }
    },
  });
}
