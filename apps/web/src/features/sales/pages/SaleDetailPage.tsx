import { useParams } from 'react-router';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { useCurrency } from '@/hooks/useCurrency';
import { SALES_PATH } from '@/layouts/navigation';
import { useBackNavigation } from '@/layouts/useNavigationHistory';
import { useSaleDetail } from '../hooks/useSalesApi';
import { SaleDetailCustomerSection } from '../components/SaleDetailCustomerSection';
import { SaleDetailPurchaseSection } from '../components/SaleDetailPurchaseSection';
import { SaleDetailSummaryCard } from '../components/SaleDetailSummaryCard';

export function SaleDetailPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const { data: sale, isPending, isError, refetch } = useSaleDetail(saleId);
  const currency = useCurrency();

  // Where the sale was opened from, so Back returns there; deep links fall back
  // to the sales tab.
  const back = useBackNavigation(SALES_PATH);

  if (isPending) {
    return (
      <PageShell>
        <PageHeader title="Sale" subtitle="Sales" backTo={back.to} backState={back.state} />
        <LoadingState label="Loading sale…" />
      </PageShell>
    );
  }

  if (isError || !sale) {
    return (
      <PageShell>
        <PageHeader title="Sale" subtitle="Sales" backTo={back.to} backState={back.state} />
        <ErrorState
          title="Could not load sale"
          description="Something went wrong while fetching this sale."
          onRetry={() => void refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={`#${sale.invoiceNumber}`}
        subtitle="Sale"
        backTo={back.to}
        backState={back.state}
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-6">
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
    </PageShell>
  );
}
