import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateBatchInput, ProductInventoryListFilters } from '@mez/types';
import { catalogKeys } from '@/hooks/useCatalogApi';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { inventoryService } from '../api/inventoryService';

/**
 * The filters flattened into a stable key suffix. A Date hashes fine, but the
 * explicit string keeps the same filter set from producing a new cache entry.
 */
function filtersKey(filters?: ProductInventoryListFilters): string {
  if (!filters) return 'default';

  return [
    filters.status ?? 'active',
    filters.stockStatus?.join(',') ?? '',
    filters.expiryStatus?.join(',') ?? '',
    filters.expiryBefore?.toISOString() ?? '',
  ].join('|');
}

export const inventoryKeys = {
  all: (businessId: string) => ['inventory', businessId] as const,
  batches: (businessId: string) => [...inventoryKeys.all(businessId), 'batches'] as const,
  batch: (businessId: string, batchId: string) =>
    [...inventoryKeys.batches(businessId), 'detail', batchId] as const,
  inventoryProductsRoot: (businessId: string) =>
    [...inventoryKeys.all(businessId), 'inventory-products'] as const,
  inventoryProducts: (businessId: string, filters?: ProductInventoryListFilters) =>
    [...inventoryKeys.inventoryProductsRoot(businessId), filtersKey(filters)] as const,
  inventoryProduct: (businessId: string, productId: string) =>
    [...inventoryKeys.inventoryProductsRoot(businessId), 'detail', productId] as const,
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

export function useBatchDetail(batchId: string | undefined) {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey:
      businessId && batchId
        ? inventoryKeys.batch(businessId, batchId)
        : ['inventory', 'batch', 'disabled'],
    queryFn: () => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      if (!batchId) {
        throw new Error('No batch selected');
      }
      return inventoryService.getBatch(businessId, batchId);
    },
    enabled: Boolean(businessId && batchId),
  });
}

export function useInventoryProducts(filters?: ProductInventoryListFilters) {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey: businessId
      ? inventoryKeys.inventoryProducts(businessId, filters)
      : ['inventory', 'products', 'disabled'],
    queryFn: () => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      return inventoryService.getInventoryProducts(businessId, filters);
    },
    enabled: Boolean(businessId),
  });
}

export function useProductInventoryDetail(productId: string | undefined) {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey:
      businessId && productId
        ? inventoryKeys.inventoryProduct(businessId, productId)
        : ['inventory', 'product', 'disabled'],
    queryFn: () => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      if (!productId) {
        throw new Error('No product selected');
      }
      return inventoryService.getInventoryProduct(businessId, productId);
    },
    enabled: Boolean(businessId && productId),
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
        queryKey: inventoryKeys.inventoryProductsRoot(businessId),
      });
      void queryClient.invalidateQueries({ queryKey: catalogKeys.products(businessId) });
    },
  });
}
