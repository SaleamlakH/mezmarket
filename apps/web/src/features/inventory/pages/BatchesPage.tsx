import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { INVENTORY_PATH } from '@/layouts/navigation';
import { useBackNavigation } from '@/layouts/useNavigationHistory';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { BatchSummaryCard } from '../components/BatchSummaryCard';
import { useCurrency } from '@/hooks/useCurrency';
import { useInventoryBatches } from '../hooks/useInventoryApi';

export function BatchesPage() {
  const { isPending, isError, refetch, data: batches = [] } = useInventoryBatches();
  const currency = useCurrency();
  const back = useBackNavigation(INVENTORY_PATH);

  return (
    <PageShell>
      <PageHeader title="All batches" backTo={back.to} backState={back.state} />

      {isPending ? (
        <LoadingState label="Loading batches…" />
      ) : isError ? (
        <ErrorState
          title="Could not load batches"
          description="Something went wrong while fetching your batches."
          onRetry={() => void refetch()}
        />
      ) : batches.length === 0 ? (
        <EmptyState
          title="No batches recorded yet"
          description="Batches you record will be listed here."
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
          {batches.map((batch) => (
            <BatchSummaryCard key={batch.id} batch={batch} currency={currency} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
