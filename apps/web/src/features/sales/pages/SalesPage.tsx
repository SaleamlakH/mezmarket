import { useState } from 'react';
import { Package, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { SectionHeader } from '@/components/SectionHeader';
import { SALES_ALL_PATH } from '@/layouts/navigation';
import { useBusinessProducts } from '@/hooks/useCatalogApi';
import { useCurrency } from '@/hooks/useCurrency';
import { useProductUploadUrls } from '@/hooks/useProductUploadUrls';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { ProductSaleCard } from '../components/ProductSaleCard';
import { SaleCartTrigger } from '../components/SaleCartTrigger';
import { SaleReviewSheet } from '../components/SaleReviewSheet';
import { SaleSummaryCard } from '../components/SaleSummaryCard';
import { useSaleDraftView } from '../hooks/useSaleDraftView';
import { useSales } from '../hooks/useSalesApi';

export function SalesPage() {
  const { isPending, isError, refetch, data: sales = [] } = useSales();
  const {
    isPending: productsPending,
    isError: productsError,
    refetch: refetchProducts,
    data: products = [],
  } = useBusinessProducts();
  const currency = useCurrency();
  const navigate = useNavigate();
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;
  const { data: uploadUrls } = useProductUploadUrls(businessId);
  const { hasLines } = useSaleDraftView();
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  return (
    <div className={`mx-auto max-w-7xl ${hasLines ? 'pb-28 md:pb-4' : 'pb-4'}`}>
      <div className="min-w-0">
        <div className="pt-1">
          <h2 className="m-0 text-lg font-bold text-(--text)">Sales</h2>
        </div>

        <SectionHeader
          icon={<ShoppingCart size={14} aria-hidden />}
          title="Recent sales"
          onSeeMore={() => navigate(SALES_ALL_PATH)}
          seeMoreLabel="See more"
        />

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

        {productsPending ? (
          <LoadingState label="Loading products…" />
        ) : productsError ? (
          <ErrorState
            title="Could not load products"
            description="Something went wrong while fetching your products."
            onRetry={() => void refetchProducts()}
          />
        ) : products.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="Add a product to your catalog to sell it here."
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-2.5">
            {products.map((product) => (
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
      </div>

      <SaleCartTrigger onReview={() => setIsReviewOpen(true)} />
      <SaleReviewSheet
        open={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        businessId={businessId}
        uploadUrls={uploadUrls}
      />
    </div>
  );
}
