import { useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import type { SaleSummaryResponse } from '@mez/types';
import { Badge, type BadgeTone } from '@/components/Badge';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RailCard } from '@/components/RailCard';
import { SectionHeader } from '@/components/SectionHeader';
import { StateSwitcher, type SectionState } from '@/components/StateSwitcher';
import { formatDate, formatMoney, pluralize } from '@/lib/format';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { sales } from '../__tests__/fixtures';

const PAYMENT_LABELS: Record<SaleSummaryResponse['paymentStatus'], string> = {
  PAID: 'Paid',
  PENDING: 'Pending',
  PARTIALLY_PAID: 'Partially paid',
};

const PAYMENT_TONES: Record<SaleSummaryResponse['paymentStatus'], BadgeTone> = {
  PAID: 'positive',
  PENDING: 'neutral',
  PARTIALLY_PAID: 'warning',
};

function statusFor(sale: SaleSummaryResponse): { label: string; tone: BadgeTone } {
  if (sale.voidStatus === 'VOIDED') return { label: 'Voided', tone: 'danger' };
  return { label: PAYMENT_LABELS[sale.paymentStatus], tone: PAYMENT_TONES[sale.paymentStatus] };
}

export function SalesPage() {
  const { currentBusiness } = useBusinessContext();
  const currency = currentBusiness?.currencyCode ?? 'ETB';
  const [state, setState] = useState<SectionState>('ready');

  return (
    <div className="mx-auto max-w-5xl pb-4">
      <div className="flex items-center justify-between gap-3 pt-1">
        <h2 className="m-0 text-lg font-bold text-(--text)">Sales</h2>
        <Button type="button">
          <Plus size={14} aria-hidden /> New sale
        </Button>
      </div>

      <SectionHeader icon={<ShoppingCart size={14} aria-hidden />} title="Recent sales" />

      <div className="mb-3">
        <StateSwitcher value={state} onChange={setState} label="Sales list state" />
      </div>

      {state === 'loading' && <LoadingState label="Loading sales…" />}

      {state === 'error' && (
        <ErrorState
          title="Could not load sales"
          description="Something went wrong while fetching your recent sales."
          onRetry={() => setState('ready')}
        />
      )}

      {state === 'empty' && (
        <EmptyState
          title="No sales recorded yet"
          description="Start a new sale and it will show up here."
        />
      )}

      {state === 'ready' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sales.map((sale) => {
            const status = statusFor(sale);

            return (
              <RailCard
                key={sale.id}
                className="shadow-(--shadow-md)"
                badge={<Badge tone={status.tone}>{status.label}</Badge>}
                badgePosition="inline"
                footer={
                  <>
                    <p className="m-0 truncate text-xs text-(--text-muted)">
                      {sale.processedBy.name}
                    </p>
                  </>
                }
              >
                <p className="m-0 pt-1 text-xs font-bold text-(--text)">{sale.invoiceNumber}</p>
                <div className="mt-0.5">
                  <p className="m-0 font-mono text-base font-semibold whitespace-nowrap tabular-nums text-(--text)">
                    {formatMoney(sale.total, currency)}
                  </p>
                  <p className="m-0 text-xs font-semibold text-(--text)">
                    {sale.itemCount} {pluralize(sale.itemCount, 'item')}
                  </p>
                </div>
                <p className="m-0 mt-1 text-xs text-(--text-muted)">
                  {formatDate(sale.saleDatetime)}
                </p>
              </RailCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
