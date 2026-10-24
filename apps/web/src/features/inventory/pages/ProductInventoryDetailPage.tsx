import { useMemo } from 'react';
import { useParams } from 'react-router';
import { Banner } from '@/components/Banner';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { useCurrency } from '@/hooks/useCurrency';
import { INVENTORY_PATH } from '@/layouts/navigation';
import { useBackNavigation } from '@/layouts/useNavigationHistory';
import { formatQuantity, pluralize } from '@/lib/format';
import { useProductInventoryDetail } from '../hooks/useInventoryApi';
import { groupLinesByUnit } from '../lib/groupLinesByUnit';
import { expiryCutoff } from '../lib/productExpiry';
import { ProductInventoryMetrics } from '../components/ProductInventoryMetrics';
import { ProductInventoryStockByUnit } from '../components/ProductInventoryStockByUnit';
import { ProductInventoryBatchList } from '../components/ProductInventoryBatchList';

export function ProductInventoryDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const currency = useCurrency();
  const now = useMemo(() => new Date(), []);
  const expiryBefore = useMemo(() => expiryCutoff(now), [now]);
  const { data: product, isPending, isError, refetch } = useProductInventoryDetail(productId);

  // Where the product was opened from, so Back returns there; deep links fall
  // back to the inventory list.
  const back = useBackNavigation(INVENTORY_PATH);

  if (isPending) {
    return (
      <PageShell>
        <PageHeader title="Product" subtitle="Inventory" backTo={back.to} backState={back.state} />
        <LoadingState label="Loading product…" />
      </PageShell>
    );
  }

  if (isError || !product) {
    return (
      <PageShell>
        <PageHeader title="Product" subtitle="Inventory" backTo={back.to} backState={back.state} />
        <ErrorState
          title="Could not load product"
          description="Something went wrong while fetching this product."
          onRetry={() => void refetch()}
        />
      </PageShell>
    );
  }

  const lines = product.batches.flatMap((batch) => batch.lines);
  const unitGroups = groupLinesByUnit(product.batches);
  const expired = product.expiry.expired;
  const expiredSummary = `${formatQuantity(expired.quantity)} ${
    product.baseUnitLabel
  } across ${expired.lotCount} ${pluralize(expired.lotCount, 'lot')}`;

  return (
    <PageShell>
      <PageHeader
        title={product.name}
        subtitle={`Base unit: ${product.baseUnitLabel} · ${lines.length} ${pluralize(lines.length, 'batch line')}`}
        backTo={back.to}
        backState={back.state}
      />

      <div>
        <ProductInventoryMetrics
          product={product}
          currency={currency}
          expiry={product.expiry}
          expiryBefore={expiryBefore}
        />
      </div>

      {expired.lotCount > 0 && (
        <div className="mt-2.5 md:mt-3">
          <Banner tone="danger" title="Expired" description={expiredSummary} />
        </div>
      )}

      <div className="mt-6">
        <ProductInventoryStockByUnit groups={unitGroups} />
      </div>

      <div className="mt-6">
        <ProductInventoryBatchList batches={product.batches} currency={currency} now={now} />
      </div>
    </PageShell>
  );
}
