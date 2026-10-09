import { useQuery } from '@tanstack/react-query';
import { useCatalogService } from '@/providers/catalog/useCatalogService';

/**
 * Single shared request for the business' signed download urls. The blobs are
 * downloaded on reference by useProductImage, so this list is fetched once and
 * read by every card, whatever feature renders it.
 */
export function useProductUploadUrls(businessId: string | undefined) {
  const catalogService = useCatalogService();

  return useQuery({
    queryKey: ['products-uploads', businessId],
    queryFn: () => catalogService.getProductUploadUrls(businessId ?? ''),
    enabled: Boolean(businessId),
  });
}
