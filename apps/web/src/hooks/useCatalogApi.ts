import { useQuery } from '@tanstack/react-query';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCatalogService } from '@/providers/catalog/useCatalogService';

/**
 * The catalog reference data shared by the screens that pick products and
 * their units — the add-batch and new-sale sheets. The product list and each
 * product's units are requested once per open sheet and read back from the
 * cache while it is open; the owning sheet drops the whole tree on close via
 * `catalogKeys.products`.
 */
export const catalogKeys = {
  all: (businessId: string) => ['catalog', businessId] as const,
  products: (businessId: string) => [...catalogKeys.all(businessId), 'products'] as const,
  productUnits: (businessId: string, productId: string) =>
    [...catalogKeys.products(businessId), 'units', productId] as const,
} as const;

export function useBusinessProducts() {
  const { currentBusiness } = useBusinessContext();
  const catalogService = useCatalogService();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey: businessId ? catalogKeys.products(businessId) : ['catalog', 'products', 'disabled'],
    queryFn: () => {
      if (!businessId) {
        throw new Error('No business selected');
      }
      return catalogService.listProducts(businessId);
    },
    enabled: Boolean(businessId),
    // Reference data: kept for the whole sheet session so row names can be
    // read back from the cache; emptied when the owning sheet closes.
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useProductUnits(productId: string | undefined) {
  const { currentBusiness } = useBusinessContext();
  const catalogService = useCatalogService();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey:
      businessId && productId
        ? catalogKeys.productUnits(businessId, productId)
        : ['catalog', 'units', 'disabled'],
    queryFn: () => {
      if (!businessId || !productId) {
        throw new Error('No business or product selected');
      }
      return catalogService.getProductUnits(businessId, productId);
    },
    enabled: Boolean(businessId && productId),
    // Reference data: always read from cache, never re-requested or evicted.
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
