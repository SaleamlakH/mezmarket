import { useState } from 'react';
import { Package, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { SectionHeader } from '@/components/SectionHeader';
import { Toast } from '@/components/Toast';
import { useCurrency } from '@/hooks/useCurrency';
import { useProductUploadUrls } from '@/hooks/useProductUploadUrls';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { NewSaleSheet } from '../components/NewSaleSheet';
import { ProductSaleCard } from '../components/ProductSaleCard';
import { SaleSummaryCard } from '../components/SaleSummaryCard';
import { saleProductsFixture } from '../fixtures/saleFlow';
import { useSales } from '../hooks/useSalesApi';
import { SaleDraftProvider } from '../state/SaleDraftProvider';

type ProductsStatus = 'loading' | 'error' | 'empty' | 'ready';
const PRODUCTS_STATUS: ProductsStatus = 'ready';

export function SalesPage() {
  return (
    <SaleDraftProvider>
      <SalesPageContent />
    </SaleDraftProvider>
  );
}

function SalesPageContent() {
  const { isPending, isError, refetch, data: sales = [] } = useSales();
  const currency = useCurrency();
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;
  const { data: uploadUrls } = useProductUploadUrls(businessId);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-5xl pb-4">
      <div className="flex items-center justify-between gap-3 pt-1">
        <h2 className="m-0 text-lg font-bold text-(--text)">Sales</h2>
        <Button type="button" onClick={() => setIsNewSaleOpen(true)}>
          <Plus size={14} aria-hidden /> New sale
        </Button>
      </div>

      <SectionHeader icon={<ShoppingCart size={14} aria-hidden />} title="Recent sales" />

      {isPending ? (
        <LoadingState label="Loading sales…" />
      ) : isError ? (
        <ErrorState
          title="Could not load sales"
          description="Something went wrong while fetching your recent sales."
          onRetry={() => void refetch()}
        />
      ) : sales.length === 0 ? (
        <EmptyState
          title="No sales recorded yet"
          description="Start a new sale and it will show up here."
        />
      ) : (
        <div className="scrollbar-none flex gap-2.5 overflow-x-auto pb-1.5">
          {sales.map((sale) => (
            <SaleSummaryCard
              key={sale.id}
              sale={sale}
              currency={currency}
              className="w-[150px] shrink-0"
            />
          ))}
        </div>
      )}

      <SectionHeader icon={<Package size={14} aria-hidden />} title="Products" />

      {PRODUCTS_STATUS === 'loading' ? (
        <LoadingState label="Loading products…" />
      ) : PRODUCTS_STATUS === 'error' ? (
        <ErrorState
          title="Could not load products"
          description="Something went wrong while fetching your products."
        />
      ) : PRODUCTS_STATUS === 'empty' || saleProductsFixture.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add a product to your catalog to sell it here."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 min-[480px]:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-3.5">
          {saleProductsFixture.map((product) => (
            <ProductSaleCard
              key={product.id}
              product={product}
              currency={currency}
              businessId={businessId}
              uploadUrls={uploadUrls}
            />
          ))}
        </div>
      )}

      <NewSaleSheet
        open={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        onRecorded={() => setSuccessMessage('Sale recorded')}
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
