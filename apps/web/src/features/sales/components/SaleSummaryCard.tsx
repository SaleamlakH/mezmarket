import type { SaleSummaryResponse } from '@mez/types';
import { Link } from 'react-router';
import { Badge, type BadgeTone } from '@/components/Badge';
import { RailCard } from '@/components/RailCard';
import { formatDate, formatMoney, formatTime, pluralize } from '@/lib/format';
import { PAYMENT_LABELS, PAYMENT_TONES } from '../lib/saleDisplay';

function statusFor(sale: SaleSummaryResponse): { label: string; tone: BadgeTone } {
  if (sale.voidStatus === 'VOIDED') return { label: 'Voided', tone: 'danger' };
  return { label: PAYMENT_LABELS[sale.paymentStatus], tone: PAYMENT_TONES[sale.paymentStatus] };
}

export interface SaleSummaryCardProps {
  sale: SaleSummaryResponse;
  currency: string;
  className?: string | undefined;
}

/** A recorded sale as a rail tile: its invoice, total, item count and time. */
export function SaleSummaryCard({ sale, currency, className = '' }: SaleSummaryCardProps) {
  const status = statusFor(sale);

  return (
    <article className={className}>
      <Link to={`/sales/${sale.id}`} className="block h-full">
        <RailCard
          className="h-full shadow-(--shadow-md)"
          badge={<Badge tone={status.tone}>{status.label}</Badge>}
          badgePosition="inline"
          footer={
            <p className="m-0 truncate text-xs text-(--text-muted)">{sale.processedBy.name}</p>
          }
        >
          <p className="m-0 pt-1 text-xs font-bold text-(--text)"># {sale.invoiceNumber}</p>
          <div className="mt-0.5">
            <p className="m-0 font-mono text-base font-semibold whitespace-nowrap tabular-nums text-(--text)">
              {formatMoney(sale.total, currency)}
            </p>
            <p className="m-0 text-xs font-semibold text-(--text)">
              {sale.itemCount} {pluralize(sale.itemCount, 'item')}
            </p>
          </div>
          <div className="mt-1 space-y-0.5 text-xs leading-tight text-(--text-muted)">
            <p className="m-0">{formatDate(sale.saleDatetime)}</p>
            <p className="m-0 tabular-nums">{formatTime(sale.saleDatetime)}</p>
          </div>
        </RailCard>
      </Link>
    </article>
  );
}
