import { useQuery } from '@tanstack/react-query';
import { productsService } from '../api/productsService';

export function useProducts(businessId: string) {
  return useQuery({
    queryKey: ['products', businessId],
    queryFn: () => productsService.listProducts(businessId),
    enabled: Boolean(businessId),
    staleTime: 5 * 60 * 1000,
  });
}
