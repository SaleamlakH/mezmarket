import { useQueries, useQuery } from '@tanstack/react-query';
import { referenceQueryPolicy } from '@/lib/queryPolicy';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCatalogService } from '@/providers/catalog/useCatalogService';

/**
 * Catalog reference data (the products and each one's units): fetched once per
 * session, cached under `catalogKeys`, refreshed only by owning mutations.
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
    ...referenceQueryPolicy,
  });
}

export interface UseProductUnitsOptions {
  /** Pass `false` until the UI wants the units. */
  enabled?: boolean | undefined;
}

export function useProductUnits(productId: string | undefined, options?: UseProductUnitsOptions) {
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
    enabled: Boolean(businessId && productId && (options?.enabled ?? true)),
    ...referenceQueryPolicy,
  });
}

/**
 * The units of each drafted product, still keyed by id — the cart reads them as
 * observers so a product's prices stay in step while its units arrive.
 */
export function useProductUnitsSnapshot(productIds: string[]) {
  const { currentBusiness } = useBusinessContext();
  const catalogService = useCatalogService();
  const businessId = currentBusiness?.id;

  const queries = useQueries({
    queries: productIds.map((productId) => ({
      queryKey: businessId
        ? catalogKeys.productUnits(businessId, productId)
        : ['catalog', 'units', 'disabled', productId],
      queryFn: () => {
        if (!businessId) {
          throw new Error('No business selected');
        }
        return catalogService.getProductUnits(businessId, productId);
      },
      enabled: Boolean(businessId && productId),
      ...referenceQueryPolicy,
    })),
  });

  return productIds.map((productId, index) => ({
    productId,
    units: queries[index]?.data ?? [],
  }));
}
