import type { DownloadUrlsResponse, ProductSummaryResponse } from '@mez/types';
import { ChevronRight } from 'lucide-react';
import { ListCard } from '@/components/ListCard';
import { useProductImage } from '@/hooks/useProductImage';
import { formatQuantity } from '@/lib/format';
import { products } from '../__tests__/fixtures';

export interface ProductPickerListProps {
  onSelect: (product: ProductSummaryResponse) => void;
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
}

function ProductPickerRow({
  product,
  businessId,
  uploadUrls,
  onSelect,
}: {
  product: ProductSummaryResponse;
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  onSelect: (product: ProductSummaryResponse) => void;
}) {
  const imageUrl = useProductImage(businessId, product.uploadId ?? undefined, uploadUrls);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(product)}
        className="focus-ring block w-full cursor-pointer rounded-xl text-left"
      >
        <ListCard
          title={product.name}
          meta={product.brand ?? 'No brand'}
          thumb={{ imageUrl: imageUrl ?? null, imageAlt: product.name }}
          className="shadow-(--shadow-md)"
          trailing={
            <span className="flex items-center gap-1">
              <span className="font-mono text-xs whitespace-nowrap text-(--text-muted)">
                {formatQuantity(product.currentSealedStock)} {product.baseUnitLabel}
              </span>
              <ChevronRight size={15} aria-hidden className="text-(--text-muted)" />
            </span>
          }
        />
      </button>
    </li>
  );
}

/** Picks the product for a new line; fixtures stand in until the catalog request is wired. */
export function ProductPickerList({ onSelect, businessId, uploadUrls }: ProductPickerListProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {products.map((product) => (
        <ProductPickerRow
          key={product.id}
          product={product}
          businessId={businessId}
          uploadUrls={uploadUrls}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
