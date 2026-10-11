import type { DownloadUrlsResponse, ProductSummaryResponse } from '@mez/types';
import { ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListCard } from '@/components/ListCard';
import { LoadingState } from '@/components/LoadingState';
import { useBusinessProducts } from '@/hooks/useCatalogApi';
import { useProductImage } from '@/hooks/useProductImage';
import { formatQuantity } from '@/lib/format';

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

/**
 * Picks the product for a new sale line. The catalog request is owned here, so
 * nothing is fetched until the picker itself is opened.
 */
export function ProductPickerList({ onSelect, businessId, uploadUrls }: ProductPickerListProps) {
  const { isPending, isError, refetch, data: products = [] } = useBusinessProducts();

  if (isPending) {
    return <LoadingState label="Loading products…" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load products"
        description="Something went wrong while fetching your products."
        onRetry={() => void refetch()}
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState title="No products yet" description="Add a product before recording a sale." />
    );
  }

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
