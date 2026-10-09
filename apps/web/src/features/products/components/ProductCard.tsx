import type { DownloadUrlsResponse } from '@mez/types';
import { RailCard } from '@/components/RailCard';
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
    <RailCard
      variant="thumbnail"
      className="shadow-(--shadow-md)"
      thumb={{ imageUrl: imageUrl ?? null, imageAlt: name }}
      footer={
        sub || price ? (
          <div className="flex items-baseline justify-between gap-2">
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
              <p className="m-0 font-mono text-[11px] whitespace-nowrap text-(--text-muted)">
                {price}
              </p>
            )}
          </div>
        ) : undefined
      }
    >
      <p className="m-0 truncate text-[15px] font-semibold text-(--text)">{name}</p>
      {meta && <p className="m-0 truncate font-mono text-[11px] text-(--text-muted)">{meta}</p>}
    </RailCard>
  );
}
