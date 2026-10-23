import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useCurrency } from '@/hooks/useCurrency';
import { SALES_PATH } from '@/layouts/navigation';
import { useBackNavigation } from '@/layouts/useNavigationHistory';
import { SaleSummaryCard } from '../components/SaleSummaryCard';
import { useSaleListFilter } from '../hooks/useSaleListFilter';
import { useSales } from '../hooks/useSalesApi';
import { SALE_HISTORY_FILTERS } from '../lib/saleListFilter';

export function AllSalesPage() {
  const { filter, filters, setFilter } = useSaleListFilter();
  const { isPending, isError, refetch, data: sales = [] } = useSales(filters);
  const currency = useCurrency();
  const back = useBackNavigation(SALES_PATH);

  return (
    <div className="mx-auto max-w-5xl pb-4">
      <div className="flex items-center gap-3 pt-1 pb-5">
        {/* On a phone the layout header already carries a back arrow. */}
        <Link
          to={back.to}
          state={back.state}
          aria-label="Back"
          className="focus-ring hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-(--border) bg-(--field) text-(--text) transition-colors hover:border-(--accent) hover:bg-(--accent) hover:text-white md:inline-flex"
        >
          <ChevronLeft size={16} aria-hidden />
        </Link>
        <h2 className="m-0 text-lg font-bold text-(--text)">All sales</h2>
      </div>

      <div role="group" aria-label="Filter sales" className="flex flex-wrap gap-2 pb-5">
        {SALE_HISTORY_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className="focus-ring cursor-pointer rounded-lg"
          >
            <Chip active={filter === option.value} tone={option.tone}>
              {option.label}
            </Chip>
          </button>
        ))}
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
          title={
            filter === 'all'
              ? 'No sales recorded yet'
              : filter === 'overdue'
                ? 'No overdue sales'
                : 'No sales match this filter'
          }
          description={
            filter === 'all'
              ? 'Start a new sale and it will show up here.'
              : filter === 'overdue'
                ? 'No unpaid sales are older than 7 days.'
                : 'Try a different filter or show all sales.'
          }
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
