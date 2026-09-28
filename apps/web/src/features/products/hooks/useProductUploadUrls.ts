import { useQuery } from '@tanstack/react-query';
import { productsService } from '../api/productsService';

/**
 * Single shared request for the business' signed download urls. The blobs are
 * downloaded on reference by useProductImage, so this list is fetched once and
 * read by every card in the grid.
 */
export function useProductUploadUrls(businessId: string | undefined) {
  return useQuery({
    queryKey: ['products-uploads', businessId],
    queryFn: () => productsService.getProductUploadUrls(businessId ?? ''),
    enabled: Boolean(businessId),
  });
}
