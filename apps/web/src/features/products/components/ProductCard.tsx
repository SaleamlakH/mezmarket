import { Image } from 'lucide-react';
import type { DownloadUrlsResponse } from '@mez/types';
import { useProductImage } from '../hooks/useProductImage';

export interface ProductCardProps {
  name: string;
  businessId?: string | undefined;
  uploadId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  meta?: string | undefined;
  price?: string | undefined;
  sub?: string | undefined;
  low?: boolean | undefined;
}

export function ProductCard({
  name,
  businessId,
  uploadId,
  uploadUrls,
  meta,
  price,
  sub,
  low,
}: ProductCardProps) {
  // The card owns its image request, so it fills in as soon as this one download
  // lands and the placeholder above covers the gap until then.
  const imageUrl = useProductImage(businessId, uploadId, uploadUrls);

  return (
    <div className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-(--border) bg-(--surface-primary) px-2 pt-2 pb-4 transition-[border-color,background-color] duration-150 hover:border-(--border-strong) hover:bg-(--surface-primary)">
      <div className="flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-[10px] border border-(--border) bg-(--surface-secondary) text-(--text-muted)">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            width={640}
            height={480}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <Image aria-hidden className="h-11 w-11" />
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-(--text)">{name}</p>
        {meta && (
          <p className="m-0 mt-0.5 truncate font-mono text-[11px] text-(--text-muted)">{meta}</p>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 border-t border-dashed border-(--border) pt-2.5">
        {sub && (
          <p
            className={`font-mono text-[13px] font-bold whitespace-nowrap ${
              low ? 'text-(--warning)' : 'text-(--text)'
            }`}
          >
            {sub}
          </p>
        )}
        {price && (
          <p className="m-0 font-mono text-[11px] whitespace-nowrap text-(--text-muted)">{price}</p>
        )}
      </div>
    </div>
  );
}
