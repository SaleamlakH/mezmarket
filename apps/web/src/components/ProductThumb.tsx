import { Image } from 'lucide-react';
import type { DownloadUrlsResponse } from '@mez/types';
import { useProductImage } from '@/hooks/useProductImage';

export interface ProductThumbProps {
  businessId?: string | undefined;
  uploadId?: string | null | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  alt?: string;
  size?: number;
  className?: string;
}

/**
 * A product's photo at a fixed size, for places that are not one of the card
 * primitives (which take an image url directly). It owns its own download
 * through useProductImage, so it fills in when that image lands and shows a
 * placeholder until then.
 */
export function ProductThumb({
  businessId,
  uploadId,
  uploadUrls,
  alt = '',
  size = 40,
  className = '',
}: ProductThumbProps) {
  const imageUrl = useProductImage(businessId, uploadId ?? undefined, uploadUrls);

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-(--border) bg-(--surface-secondary) text-(--text-muted) ${className}`}
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          width={640}
          height={480}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <Image size={Math.round(size * 0.45)} aria-hidden />
      )}
    </span>
  );
}
