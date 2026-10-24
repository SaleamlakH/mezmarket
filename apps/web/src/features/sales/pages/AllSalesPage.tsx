import { useState } from 'react';
import { Dialog, DialogHeader } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FilterBar, FilterOption, type ActiveFilterChip } from '@/components/FilterBar';
import { LoadingState } from '@/components/LoadingState';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { useCurrency } from '@/hooks/useCurrency';
import { SALES_PATH } from '@/layouts/navigation';
import { useBackNavigation } from '@/layouts/useNavigationHistory';
import { SaleSummaryCard } from '../components/SaleSummaryCard';
import { useSaleListFilter } from '../hooks/useSaleListFilter';
import { useSales } from '../hooks/useSalesApi';
import { SALE_HISTORY_FILTERS, type SaleListDateFilters } from '../lib/saleListFilter';

function dateFilterLabel(dates: SaleListDateFilters): string {
  const hasSale = Boolean(dates.from || dates.to);
  const hasPayment = Boolean(dates.paymentFrom || dates.paymentTo);
  if (hasSale && hasPayment) return 'Sale & payment dates';
  if (hasPayment) return 'Payment dates';
  return 'Sale dates';
}

export function AllSalesPage() {
  const { filter, filters, dateFilters, setFilter, clearDateFilters } = useSaleListFilter();
  const { isPending, isError, refetch, data: sales = [] } = useSales(filters);
  const currency = useCurrency();
  const back = useBackNavigation(SALES_PATH);
  const [open, setOpen] = useState(false);

  const activeFilters: ActiveFilterChip[] = [];
  const selected = SALE_HISTORY_FILTERS.find((option) => option.value === filter);
  if (selected && filter !== 'all') {
    activeFilters.push({
      key: filter,
      label: selected.label,
      tone: selected.tone,
      onRemove: () => setFilter('all'),
    });
  }

  if (Object.keys(dateFilters).length > 0) {
    activeFilters.push({
      key: 'dates',
      label: dateFilterLabel(dateFilters),
      tone: 'neutral',
      onRemove: clearDateFilters,
    });
  }

  return (
    <PageShell>
      <PageHeader title="All sales" backTo={back.to} backState={back.state} />

      <div className="pb-5">
        <FilterBar activeFilters={activeFilters} onOpen={() => setOpen(true)} />
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} size="md">
        <DialogHeader title="Filter sales" onClose={() => setOpen(false)} />
        <div className="flex flex-col gap-2 pb-4">
          {SALE_HISTORY_FILTERS.map((option) => (
            <FilterOption
              key={option.value}
              active={filter === option.value}
              tone={option.tone}
              onClick={() => {
                setFilter(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </FilterOption>
          ))}
        </div>
      </Dialog>

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
    </PageShell>
  );
}
