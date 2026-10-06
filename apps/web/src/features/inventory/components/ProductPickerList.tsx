import type { ProductSummary, ProductSummaryResponse } from '@mez/types';
import { ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { formatQuantity } from '@/lib/format';
import { ProductImage } from './ProductImage';

export interface ProductPickerListProps {
  products: ProductSummary[];
  onSelect: (product: ProductSummaryResponse) => void;
}

/**
 * Picks the product a new batch line is for. Every product is offered — a
 * delivery can legitimately carry the same product twice in different
 * units, so nothing is filtered out once a product has been used.
 */
export function ProductPickerList({ products, onSelect }: ProductPickerListProps) {
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
            className="focus-ring flex w-full cursor-pointer items-center gap-3 rounded-xl border border-(--border) bg-(--field) px-3 py-2.5 text-left transition-colors hover:border-(--text-muted)"
          >
            <ProductImage size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-(--text)">
                {product.name}
              </span>
              <span className="mt-1 block truncate text-xs text-(--text-muted)">
                {product.brand ?? 'No brand'}
              </span>
            </span>
            <span className="shrink-0 font-mono text-xs whitespace-nowrap text-(--text-muted)">
              {formatQuantity(product.currentSealedStock)} {product.baseUnitLabel}
            </span>
            <ChevronRight size={15} aria-hidden className="shrink-0 text-(--text-muted)" />
          </button>
        </li>
      ))}
    </ul>
  );
}
