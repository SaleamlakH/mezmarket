import type { ProductSummaryResponse } from '@mez/types';
import { ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListCard } from '@/components/ListCard';
import { LoadingState } from '@/components/LoadingState';
import { formatQuantity } from '@/lib/format';
import { useBusinessProducts } from '../hooks/useInventoryApi';

export interface ProductPickerListProps {
  onSelect: (product: ProductSummaryResponse) => void;
}

/**
 * Picks the product a new batch line is for. Every product is offered — a
 * delivery can legitimately carry the same product twice in different
 * units, so nothing is filtered out once a product has been used. The
 * catalog request is owned here, so nothing is fetched until the picker
 * itself is opened.
 */
export function ProductPickerList({ onSelect }: ProductPickerListProps) {
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
      <EmptyState title="No products yet" description="Add a product before receiving stock." />
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {products.map((product) => (
        <li key={product.id}>
          <button
            type="button"
            onClick={() => onSelect(product)}
            className="focus-ring block w-full cursor-pointer rounded-xl text-left"
          >
            <ListCard
              title={product.name}
              meta={product.brand ?? 'No brand'}
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
      ))}
    </ul>
  );
}
