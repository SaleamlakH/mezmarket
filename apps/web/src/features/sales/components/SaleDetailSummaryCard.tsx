import type { SaleDetailResponse } from '@mez/types';
import { Badge, type BadgeTone } from '@/components/Badge';
import { formatMoney } from '@/lib/format';
import { PAYMENT_LABELS, PAYMENT_TONES } from '../lib/saleDisplay';
import { SaleDetailCustomerSection } from './SaleDetailCustomerSection';
import { SaleDetailPaymentStatus } from './SaleDetailPaymentStatus';
import { SaleDetailPaymentsSection } from './SaleDetailPaymentsSection';

/** The sale's status label and tone. */
function statusFor(sale: SaleDetailResponse): { label: string; tone: BadgeTone } {
  if (sale.voidStatus === 'VOIDED') return { label: 'Voided', tone: 'danger' };
  return { label: PAYMENT_LABELS[sale.paymentStatus], tone: PAYMENT_TONES[sale.paymentStatus] };
}

export interface SaleDetailSummaryCardProps {
  sale: SaleDetailResponse;
  currency: string;
}

/** The sale at a glance: total, status, payments and customer. */
export function SaleDetailSummaryCard({ sale, currency }: SaleDetailSummaryCardProps) {
  const status = statusFor(sale);
  const isVoided = sale.voidStatus === 'VOIDED';
  const isSettled = !isVoided && sale.paymentStatus === 'PAID' && sale.balanceDue <= 0;
  const showPayments = sale.payments.length > 0;
  const canPay = !isVoided && !isSettled;

  return (
    <aside className="rounded-xl border border-(--border) bg-(--surface-primary) p-4 shadow-(--shadow-sm)">
      <p className="m-0 text-sm text-(--text-muted)">Summary</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="font-mono text-2xl font-semibold tabular-nums text-(--text)">
          {formatMoney(sale.total, currency)}
        </span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {!isSettled && (
        <div className="mt-4 border-t border-(--border) pt-3">
          <div className="flex items-baseline justify-between gap-3 py-0.5 text-sm">
            <span className="text-(--text-muted)">Paid</span>
            <span className="font-mono tabular-nums text-(--text-muted)">
              {formatMoney(sale.amountPaid, currency)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-0.5 text-sm font-medium">
            <span className="text-(--text)">Remaining</span>
            <span className="font-mono tabular-nums text-(--text)">
              {formatMoney(sale.balanceDue, currency)}
            </span>
          </div>
        </div>
      )}

      {showPayments && (
        <div className={canPay ? 'mt-4' : undefined}>
          <div className="my-4 border-t border-(--border)" />
          <SaleDetailPaymentsSection sale={sale} currency={currency} />
        </div>
      )}

      <div className="hidden md:block">
        <div className="my-4 border-t border-(--border)" />
        <SaleDetailCustomerSection sale={sale} />
      </div>

      {canPay && (
        <div>
          <div className="my-4 border-t border-(--border)" />
          <SaleDetailPaymentStatus sale={sale} />
        </div>
      )}
    </aside>
  );
}
