import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { INVENTORY_PATH } from '@/layouts/navigation';
import { BatchSummaryCard } from '../components/BatchSummaryCard';
import { useCurrency } from '../hooks/useCurrency';
import { useInventoryData } from '../hooks/useInventoryData';

export function BatchesPage() {
  const { batches } = useInventoryData();
  const currency = useCurrency();

  return (
    <div className="mx-auto max-w-5xl pb-4">
      <div className="flex items-center gap-3 pt-1 pb-5">
        {/* On a phone the layout header already carries a back arrow. */}
        <Link
          to={INVENTORY_PATH}
          aria-label="Back to inventory"
          className="focus-ring hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-(--border) bg-(--field) text-(--text) transition-colors hover:border-(--accent) hover:bg-(--accent) hover:text-white md:inline-flex"
        >
          <ChevronLeft size={16} aria-hidden />
        </Link>
        <h2 className="m-0 text-lg font-bold text-(--text)">All batches</h2>
      </div>

      {batches.length === 0 ? (
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
    </div>
  );
}
