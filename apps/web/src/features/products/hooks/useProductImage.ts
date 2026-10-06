import { useQuery } from '@tanstack/react-query';
import type { DownloadUrlsResponse } from '@mez/types';
import { imageCache } from '@/lib/imageCache';

/**
 * Downloads one product image the first time a card references it, then returns the
 * cached object url on every later read. Each image owns its own query, so a slow or
 * failing download never blocks or fails the rest of the grid, and completing one
 * re-renders only that card.
 */
export function useProductImage(
  businessId: string | undefined,
  uploadId: string | undefined,
  uploadUrls: DownloadUrlsResponse | undefined,
): string | undefined {
  const entry = uploadId ? uploadUrls?.find((item) => item.uploadId === uploadId) : undefined;
  const cachedUrl = uploadId ? imageCache.getObjectUrl(uploadId) : undefined;

  useQuery({
    // Deliberately not keyed on the signed url: the endpoint mints a fresh one on
    // every call, so including it would re-download on every signing refetch.
    queryKey: ['product-image', businessId, uploadId],
    queryFn: async () => {
      if (!uploadId || !entry?.url) {
        throw new Error(`No download url for upload ${uploadId ?? 'unknown'}`);
      }
      const response = await fetch(entry.url);
      if (!response.ok) {
        throw new Error(`Failed to download image for ${uploadId}`);
      }
      imageCache.set(uploadId, await response.blob());
      return true;
    },
    // A null url means the signing list has not caught up with a new product yet, so
    // the query waits for one instead of erroring. !cachedUrl is what makes the
    // session cache authoritative over a repeat visit.
    enabled: Boolean(businessId && uploadId && entry?.url && !cachedUrl),
  });

  return cachedUrl;
}
