import { useQuery } from '@tanstack/react-query';
import { productsService } from '../api/productsService';

export function useProducts(businessId: string) {
  return useQuery({
    queryKey: ['products', businessId],
    // The catalog shows every product, the inactive ones marked as such, so it asks
    // for the whole set rather than the active-only default the pickers rely on.
    queryFn: () => productsService.listProducts(businessId, 'all'),
    enabled: Boolean(businessId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProduct(businessId: string, productId: string | undefined) {
  return useQuery({
    queryKey: ['product', businessId, productId],
    queryFn: () => productsService.getProduct(businessId, productId as string),
    enabled: Boolean(businessId && productId),
    staleTime: 5 * 60 * 1000,
  });
}
