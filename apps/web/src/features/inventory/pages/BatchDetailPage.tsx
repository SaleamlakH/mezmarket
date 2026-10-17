import { Link, useLocation, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components';
import { useCurrency } from '@/hooks/useCurrency';
import { BATCHES_PATH, INVENTORY_PATH } from '@/layouts/navigation';
import { formatDate } from '@/lib/format';
import { useBatchDetail } from '../hooks/useInventoryApi';
import { BatchDetailPurchaseSection } from '../components/BatchDetailPurchaseSection';
import { BatchDetailSummaryCard } from '../components/BatchDetailSummaryCard';

export function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { state } = useLocation();
  const { data: batch, isPending, isError, refetch } = useBatchDetail(batchId);
  const currency = useCurrency();

  // Where the batch was opened from, so Back returns there; deep links fall
  // back to the batches list.
  const from = (state as { from?: string } | null)?.from;
  const isFromInventory = from === INVENTORY_PATH;
  const backTo = isFromInventory ? INVENTORY_PATH : BATCHES_PATH;

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-4">
        <LoadingState label="Loading batch…" />
      </div>
    );
  }

  if (isError || !batch) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-4">
        <ErrorState
          title="Could not load batch"
          description="Something went wrong while fetching this batch."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-3 pt-3 pb-6 md:px-6 md:pt-6">
      <header className="flex items-center gap-2.5">
        <Link
          to={backTo}
          aria-label={isFromInventory ? 'Back to inventory' : 'Back to batches'}
          title="Back"
        >
          <Button variant="secondary" size="sm" shape="pill">
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </Button>
        </Link>
        <nav
          aria-label="Breadcrumb"
          className="min-w-0 truncate text-xl font-bold text-(--text) md:text-2xl"
        >
          <Link to={BATCHES_PATH} className="hover:underline">
            Batches
          </Link>
          <span className="mx-1 text-(--text-muted)">/</span>
          <span>{batch.referenceNumber ?? formatDate(batch.batchDate)}</span>
        </nav>
      </header>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-6">
        <aside className="md:order-2">
          <BatchDetailSummaryCard batch={batch} currency={currency} />
        </aside>

        <div className="min-w-0 md:order-1">
          <div className="rounded-xl border border-(--border) bg-(--surface-primary) p-4">
            <BatchDetailPurchaseSection batch={batch} currency={currency} />
          </div>
        </div>
      </div>
    </div>
  );
}
