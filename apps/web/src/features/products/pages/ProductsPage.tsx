import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import type { CreateProductResponse, ProductWithUnitsResponse } from '@mez/types';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Loader } from '@/components/Loader';
import { Toast } from '@/components/Toast';
import { AddProductDialog } from '../components/AddProductDialog';
import { ProductCard } from '../components/ProductCard';
import { useBusinessContext } from '@/providers/business/useBusinessContext';

interface CardView {
  name: string;
  meta?: string | undefined;
  price?: string | undefined;
  sub?: string | undefined;
  low?: boolean | undefined;
  imageUrl?: string | undefined;
}

type MockStatus = 'loading' | 'error' | 'empty' | 'ready';

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
    price: price != null && symbol ? `${price} ${currency} / ${symbol}` : undefined,
    sub: `${product.currentSealedStock}${symbol ? ` ${symbol}` : ''}`,
    low,
    imageUrl,
  };
}

const MOCK_PRODUCTS: ProductWithUnitsResponse[] = [
  {
    id: 'p-1',
    businessId: 'b-1',
    branchId: 'branch-1',
    categoryId: null,
    name: 'Bulk Coffee',
    brand: 'Momi',
    description: null,
    trackAsPartial: false,
    lowStockThreshold: 5,
    currentSealedStock: 12,
    active: true,
    uploadId: null,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    units: [
      {
        id: 'u-1',
        productId: 'p-1',
        unitRole: 'BASE',
        standardUnitId: null,
        name: 'kg',
        dependsOn: null,
        conversionRate: null,
        price: 850,
        purchaseCapable: true,
        sellCapable: true,
        createdAt: '2026-01-10T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
      {
        id: 'u-2',
        productId: 'p-1',
        unitRole: 'MOU',
        standardUnitId: null,
        name: '500 g',
        dependsOn: 'BASE',
        conversionRate: 0.5,
        price: 425,
        purchaseCapable: false,
        sellCapable: true,
        createdAt: '2026-01-10T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ],
  },
];

export function ProductsPage() {
  const { currentBusiness } = useBusinessContext();
  const currency = currentBusiness?.currencyCode ?? 'ETB';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState<MockStatus>('ready');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCreated = useCallback((product: CreateProductResponse) => {
    setDialogOpen(false);
    setSuccessMessage(`${product.name} added to products.`);
  }, []);

  const mockRefetch = useCallback(() => {
    setStatus('loading');
    window.setTimeout(() => setStatus('ready'), 700);
  }, []);

  const flags = [
    { id: 'loading' as const, label: 'Loading' },
    { id: 'error' as const, label: 'Error' },
    { id: 'empty' as const, label: 'Empty' },
    { id: 'ready' as const, label: 'Ready' },
  ];

  const products = MOCK_PRODUCTS;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-4 mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-bold tracking-tight text-(--text)">Products</h1>
          {status === 'ready' && (
            <p className="m-0 mt-0.5 text-[12px] text-(--text-muted)">
              {products.length > 0
                ? `${products.length} product${products.length === 1 ? '' : 's'}`
                : 'Your product catalog'}
            </p>
          )}
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus size={16} aria-hidden />
          Add product
        </Button>
      </div>

      <div role="group" aria-label="Mock state preview" className="mb-4 flex flex-wrap gap-1.5">
        {flags.map((flag) => (
          <Button
            key={flag.id}
            variant={status === flag.id ? 'primary' : 'secondary'}
            onClick={() => setStatus(flag.id)}
          >
            {flag.label}
          </Button>
        ))}
      </div>

      {status === 'loading' ? (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-2 py-16">
          <Loader />
          <span className="sr-only">Loading products</span>
        </div>
      ) : status === 'error' ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-(--border) bg-(--surface-primary)/60 px-6 py-10 text-center">
          <p className="m-0 text-[13px] font-semibold text-(--text)">Couldn’t load your products</p>
          <p className="m-0 text-[11px] text-(--text-muted)">
            Check your connection and try again.
          </p>
          <Button variant="secondary" onClick={() => void mockRefetch()}>
            Try again
          </Button>
        </div>
      ) : status === 'empty' ? (
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
            <ProductCard key={product.name} {...cardFor(product, undefined, currency)} />
          ))}
        </div>
      )}

      <AddProductDialog
        open={dialogOpen}
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
