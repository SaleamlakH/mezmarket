import { Link, useLocation, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components';
import { useCurrency } from '@/hooks/useCurrency';
import { INVENTORY_PATH } from '@/layouts/navigation';
import { pluralize } from '@/lib/format';
import { useProductInventoryDetail } from '../hooks/useInventoryApi';
import { flattenProductBatchLines } from '../lib/flattenProductBatchLines';
import { groupLinesByUnit } from '../lib/groupLinesByUnit';
import { expiringSoonLineCount, expiryAlertTotals } from '../lib/productExpiry';
import { ProductInventoryMetrics } from '../components/ProductInventoryMetrics';
import { ProductInventoryExpiryAlert } from '../components/ProductInventoryExpiryAlert';
import { ProductInventoryStockByUnit } from '../components/ProductInventoryStockByUnit';
import { ProductInventoryBatchList } from '../components/ProductInventoryBatchList';

export function ProductInventoryDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { state } = useLocation();
  const { data: product, isPending, isError, refetch } = useProductInventoryDetail(productId);
  const currency = useCurrency();

  // Where the product was opened from, so Back returns there; deep links fall
  // back to the inventory list.
  const backTo = (state as { from?: string } | null)?.from ?? INVENTORY_PATH;

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-4">
        <LoadingState label="Loading product…" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-4">
        <ErrorState
          title="Could not load product"
          description="Something went wrong while fetching this product."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const now = new Date();
  const rows = flattenProductBatchLines(product.batches);
  const lines = rows.map((row) => row.line);
  const unitGroups = groupLinesByUnit(rows);
  const alertTotals = expiryAlertTotals(lines, now);
  const expiringSoonCount = expiringSoonLineCount(lines, now);

  return (
    <div className="mx-auto max-w-3xl px-3 pt-3 pb-6 md:px-6 md:pt-6">
      <header className="flex items-center gap-2.5">
        <Link to={backTo} aria-label="Back to inventory" title="Back">
          <Button variant="secondary" size="sm" shape="pill">
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="m-0 truncate text-xl font-bold text-(--text) md:text-2xl">
            {product.name}
          </h1>
          <p className="m-0 text-xs text-(--text-muted)">
            Base unit: {product.baseUnitLabel} · {rows.length}{' '}
            {pluralize(rows.length, 'batch line')}
          </p>
        </div>
      </header>

      <div className="mt-5">
        <ProductInventoryMetrics
          product={product}
          currency={currency}
          expiringSoonCount={expiringSoonCount}
        />
      </div>

      {(alertTotals.expiredQuantity > 0 || alertTotals.soonQuantity > 0) && (
        <div className="mt-3">
          <ProductInventoryExpiryAlert totals={alertTotals} baseUnitLabel={product.baseUnitLabel} />
        </div>
      )}

      <div className="mt-6">
        <ProductInventoryStockByUnit groups={unitGroups} baseUnitLabel={product.baseUnitLabel} />
      </div>

      <div className="mt-6">
        <ProductInventoryBatchList rows={rows} currency={currency} now={now} />
      </div>
    </div>
  );
}
