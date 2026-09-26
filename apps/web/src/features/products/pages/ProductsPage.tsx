import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { CreateProductResponse, ProductWithUnitsResponse } from '@mez/types';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Loader } from '@/components/Loader';
import { Toast } from '@/components/Toast';
import { formatMoney, pluralize } from '@/lib/format';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { AddProductDialog } from '../components/AddProductDialog';
import { ProductCard } from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';
import { useQuery } from '@tanstack/react-query';
import { productsService } from '../api/productsService';

interface CardView {
  name: string;
  meta?: string | undefined;
  price?: string | undefined;
  sub?: string | undefined;
  low?: boolean | undefined;
  imageUrl?: string | undefined;
}

function cardFor(
  product: ProductWithUnitsResponse,
  imageUrl: string | undefined,
  currency: string,
): CardView {
  const baseUnit = product.units.find((unit) => unit.unitRole === 'BASE');
  const price = baseUnit?.price;
  const symbol = baseUnit?.name;
  const sell = product.units
    .filter((unit) => unit.sellCapable)
    .map((unit) => unit.name)
    .join(', ');
  const low =
    product.lowStockThreshold != null && product.currentSealedStock <= product.lowStockThreshold;
  return {
    name: product.name,
    meta: sell ? `sold by ${sell}` : (product.brand ?? undefined),
    price: formatMoney(price, currency, symbol),
    sub: `${product.currentSealedStock}${symbol ? ` ${symbol}` : ''}`,
    low,
    imageUrl,
  };
}

export function ProductsPage() {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;
  const currency = currentBusiness?.currencyCode ?? 'ETB';

  const { data, isLoading, isError, isRefetching, refetch } = useProducts(businessId ?? '');
  const { data: uploadUrls = [] } = useQuery({
    queryKey: ['products-uploads', businessId],
    queryFn: () => productsService.getProductUploadUrls(businessId ?? ''),
    enabled: Boolean(businessId),
    staleTime: 5 * 60 * 1000,
  });

  const imageUrlByUploadId = useMemo(() => {
    const urls = new Map<string, string>();
    for (const entry of uploadUrls) {
      if (entry.url) urls.set(entry.uploadId, entry.url);
    }
    return urls;
  }, [uploadUrls]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCreated = useCallback((product: CreateProductResponse) => {
    setDialogOpen(false);
    setSuccessMessage(`${product.name} added to products.`);
  }, []);

  const products = data ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-4 mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-bold tracking-tight text-(--text)">Products</h1>
          {data && (
            <p className="m-0 mt-0.5 text-[12px] text-(--text-muted)">
              {products.length > 0
                ? `${products.length} ${pluralize(products.length, 'product')}`
                : 'Your product catalog'}
            </p>
          )}
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus size={16} aria-hidden />
          Add product
        </Button>
      </div>

      {!businessId || isLoading ? (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-2 py-16">
          <Loader />
          <span className="sr-only">Loading products</span>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-(--border) bg-(--surface-primary)/60 px-6 py-10 text-center">
          <p className="m-0 text-[13px] font-semibold text-(--text)">Couldn’t load your products</p>
          <p className="m-0 text-[11px] text-(--text-muted)">
            Check your connection and try again.
          </p>
          <Button variant="secondary" onClick={() => void refetch()} isLoading={isRefetching}>
            Try again
          </Button>
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first product to start building your catalog."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus size={16} aria-hidden />
              Add product
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:gap-3.5">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              {...cardFor(
                product,
                product.uploadId ? imageUrlByUploadId.get(product.uploadId) : undefined,
                currency,
              )}
            />
          ))}
        </div>
      )}

      <AddProductDialog
        open={dialogOpen}
        businessId={businessId ?? ''}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />

      {successMessage && (
        <Toast
          message={successMessage}
          variant="success"
          duration={3000}
          position="top-center"
          onDismiss={() => setSuccessMessage(null)}
        />
      )}
    </div>
  );
}
