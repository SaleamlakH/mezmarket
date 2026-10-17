import { Image } from 'lucide-react';
import type { DownloadUrlsResponse } from '@mez/types';
import { useProductImage } from '@/hooks/useProductImage';

export interface ProductThumbProps {
  businessId?: string | undefined;
  uploadId?: string | null | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  alt?: string;
  /** Side of a square thumb. Ignored when `width`/`height` are given. */
  size?: number;
  /** Explicit width; falls back to `size`. */
  width?: number;
  /** Explicit height; falls back to `width` (making the thumb square). */
  height?: number;
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
  size,
  width,
  height,
  className = '',
}: ProductThumbProps) {
  const imageUrl = useProductImage(businessId, uploadId ?? undefined, uploadUrls);
  const thumbWidth = width ?? size ?? 40;
  const thumbHeight = height ?? width ?? size ?? 40;

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-(--border) bg-(--surface-secondary) text-(--text-muted) ${className}`}
      style={{ width: thumbWidth, height: thumbHeight }}
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
        <Image size={Math.round(Math.min(thumbWidth, thumbHeight) * 0.45)} aria-hidden />
      )}
    </span>
  );
}
