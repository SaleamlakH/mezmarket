import type { DownloadUrlsResponse, ProductSummaryResponse } from '@mez/types';
import { Plus } from 'lucide-react';
import { IconButton } from '@/components/IconButton';
import { RailCard } from '@/components/RailCard';
import { useProductImage } from '@/hooks/useProductImage';
import { formatQuantity } from '@/lib/format';

export interface ProductSaleCardProps {
  product: ProductSummaryResponse;
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  /** Wired in the next step; inert for now. */
  onAdd?: ((product: ProductSummaryResponse) => void) | undefined;
}

/**
 * A product as offered on the new-sale screen: its photo, name, brand and stock
 * on hand, with an add button beside them. The button is a no-op until the add
 * flow lands, so the card just presents the catalog today.
 */
export function ProductSaleCard({ product, businessId, uploadUrls, onAdd }: ProductSaleCardProps) {
  // The card owns its image request, so it fills in as soon as this one download
  // lands and the placeholder above covers the gap until then.
  const imageUrl = useProductImage(businessId, product.uploadId ?? undefined, uploadUrls);

  const isLow =
    product.lowStockThreshold != null && product.currentSealedStock <= product.lowStockThreshold;

  return (
    <RailCard
      variant="thumbnail"
      className="shadow-(--shadow-md)"
      thumb={{ imageUrl: imageUrl ?? null, imageAlt: product.name }}
    >
      <p className="m-0 truncate text-[15px] font-semibold text-(--text)">{product.name}</p>

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="m-0 truncate font-mono text-[11px] text-(--text-muted)">
            {product.brand ?? 'No brand'}
          </p>
          <p
            className={`m-0 truncate font-mono text-[11px] ${
              isLow ? 'text-(--warning)' : 'text-(--text-muted)'
            }`}
          >
            {formatQuantity(product.currentSealedStock)} {product.baseUnitLabel}
            <span className="sr-only"> in stock</span>
          </p>
        </div>

        <IconButton
          label={`Add ${product.name}`}
          icon={<Plus size={16} aria-hidden />}
          size="sm"
          onClick={() => onAdd?.(product)}
          className="self-end"
        />
      </div>
    </RailCard>
  );
}
