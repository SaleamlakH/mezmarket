import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateBatchInput } from '@mez/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { inventoryService } from '../api/inventoryService';

export const inventoryKeys = {
  all: (businessId: string) => ['inventory', businessId] as const,
  batches: (businessId: string) => [...inventoryKeys.all(businessId), 'batches'] as const,
  inventoryProducts: (businessId: string) =>
    [...inventoryKeys.all(businessId), 'inventory-products'] as const,
  products: (businessId: string) => [...inventoryKeys.all(businessId), 'products'] as const,
  productUnits: (businessId: string, productId: string) =>
    [...inventoryKeys.products(businessId), 'units', productId] as const,
} as const;

export function useInventoryBatches() {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey: businessId ? inventoryKeys.batches(businessId) : ['inventory', 'batches', 'disabled'],
    queryFn: () => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      return inventoryService.getBatches(businessId);
    },
    enabled: Boolean(businessId),
  });
}

export function useInventoryProducts() {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey: businessId
      ? inventoryKeys.inventoryProducts(businessId)
      : ['inventory', 'products', 'disabled'],
    queryFn: () => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      return inventoryService.getInventoryProducts(businessId);
    },
    enabled: Boolean(businessId),
  });
}

export function useBusinessProducts() {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey: businessId
      ? inventoryKeys.products(businessId)
      : ['inventory', 'business-products', 'disabled'],
    queryFn: () => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      return inventoryService.getProducts(businessId);
    },
    enabled: Boolean(businessId),
    // Reference data: kept for the whole add-batch session so row names can
    // be read back from the cache; expired in AddBatchSheet's close().
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useProductUnits(productId: string | undefined) {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey:
      businessId && productId
        ? inventoryKeys.productUnits(businessId, productId)
        : ['inventory', 'units', 'disabled'],
    queryFn: () => {
      if (!businessId || !productId) {
        throw new Error('No business or product selected');
      }
      return inventoryService.getProductUnits(businessId, productId);
    },
    enabled: Boolean(businessId && productId),
    // Reference data: always read from cache, never re-requested or evicted.
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useCreateBatch() {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBatchInput) => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      return inventoryService.createBatch(businessId, input);
    },
    onSuccess: () => {
      if (!businessId) return;
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.batches(businessId) });
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.inventoryProducts(businessId),
      });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.products(businessId) });
    },
  });
}
