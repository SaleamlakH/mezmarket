import { Link, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { useCurrency } from '@/hooks/useCurrency';
import { useSaleDetail } from '../hooks/useSalesApi';
import { SaleDetailCustomerSection } from '../components/SaleDetailCustomerSection';
import { SaleDetailPurchaseSection } from '../components/SaleDetailPurchaseSection';
import { SaleDetailSummaryCard } from '../components/SaleDetailSummaryCard';
import { Button } from '@/components';

export function SaleDetailPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const { data: sale, isPending, isError, refetch } = useSaleDetail(saleId);
  const currency = useCurrency();

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-4">
        <LoadingState label="Loading sale…" />
      </div>
    );
  }

  if (isError || !sale) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-4">
        <ErrorState
          title="Could not load sale"
          description="Something went wrong while fetching this sale."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-3 pt-3 pb-6 md:px-6 md:pt-6">
      <header className="flex items-center gap-2.5">
        <Link to="/sales" aria-label="Back to sales" title="Back">
          <Button variant="secondary" size="sm" shape="pill">
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </Button>
        </Link>
        <nav
          aria-label="Breadcrumb"
          className="min-w-0 truncate text-xl font-bold text-(--text) md:text-2xl"
        >
          <Link to="/sales" className="hover:underline">
            Sales
          </Link>
          <span className="mx-1 text-(--text-muted)">/</span>
          <span>#{sale.invoiceNumber}</span>
        </nav>
      </header>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-6">
        <aside className="md:order-2">
          <SaleDetailSummaryCard sale={sale} currency={currency} />
        </aside>

        <div className="min-w-0 md:order-1">
          <div className="rounded-xl border border-(--border) bg-(--surface-primary) p-4">
            <SaleDetailPurchaseSection sale={sale} currency={currency} />
          </div>
        </div>

        <div className="md:hidden">
          <SaleDetailCustomerSection sale={sale} card />
        </div>
      </div>
    </div>
  );
}
