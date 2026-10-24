import { useParams } from 'react-router';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { useCurrency } from '@/hooks/useCurrency';
import { BATCHES_PATH } from '@/layouts/navigation';
import { useBackNavigation } from '@/layouts/useNavigationHistory';
import { formatDate } from '@/lib/format';
import { useBatchDetail } from '../hooks/useInventoryApi';
import { BatchDetailPurchaseSection } from '../components/BatchDetailPurchaseSection';
import { BatchDetailSummaryCard } from '../components/BatchDetailSummaryCard';

export function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { data: batch, isPending, isError, refetch } = useBatchDetail(batchId);
  const currency = useCurrency();

  // Where the batch was opened from, so Back returns there; deep links fall
  // back to the batches list.
  const back = useBackNavigation(BATCHES_PATH);

  if (isPending) {
    return (
      <PageShell>
        <PageHeader title="Batch" subtitle="Inventory" backTo={back.to} backState={back.state} />
        <LoadingState label="Loading batch…" />
      </PageShell>
    );
  }

  if (isError || !batch) {
    return (
      <PageShell>
        <PageHeader title="Batch" subtitle="Inventory" backTo={back.to} backState={back.state} />
        <ErrorState
          title="Could not load batch"
          description="Something went wrong while fetching this batch."
          onRetry={() => void refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={batch.referenceNumber ?? formatDate(batch.batchDate)}
        subtitle="Stock batch"
        backTo={back.to}
        backState={back.state}
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-6">
        <aside className="md:order-2">
          <BatchDetailSummaryCard batch={batch} currency={currency} />
        </aside>

        <div className="min-w-0 md:order-1">
          <div className="rounded-xl border border-(--border) bg-(--surface-primary) p-4">
            <BatchDetailPurchaseSection batch={batch} currency={currency} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
