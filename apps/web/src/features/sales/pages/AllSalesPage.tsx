import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useCurrency } from '@/hooks/useCurrency';
import { SALES_PATH } from '@/layouts/navigation';
import { SaleSummaryCard } from '../components/SaleSummaryCard';
import { useSales } from '../hooks/useSalesApi';

export function AllSalesPage() {
  const { isPending, isError, refetch, data: sales = [] } = useSales();
  const currency = useCurrency();

  return (
    <div className="mx-auto max-w-5xl pb-4">
      <div className="flex items-center gap-3 pt-1 pb-5">
        {/* On a phone the layout header already carries a back arrow. */}
        <Link
          to={SALES_PATH}
          aria-label="Back to sales"
          className="focus-ring hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-(--border) bg-(--field) text-(--text) transition-colors hover:border-(--accent) hover:bg-(--accent) hover:text-white md:inline-flex"
        >
          <ChevronLeft size={16} aria-hidden />
        </Link>
        <h2 className="m-0 text-lg font-bold text-(--text)">All sales</h2>
      </div>

      {isPending ? (
        <LoadingState label="Loading sales…" />
      ) : isError ? (
        <ErrorState
          title="Could not load sales"
          description="Something went wrong while fetching your sales."
          onRetry={() => void refetch()}
        />
      ) : sales.length === 0 ? (
        <EmptyState
          title="No sales recorded yet"
          description="Start a new sale and it will show up here."
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
          {sales.map((sale) => (
            <SaleSummaryCard key={sale.id} sale={sale} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}
