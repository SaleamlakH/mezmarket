import { formatMoney } from '@/lib/format';
import type { SaleTotalsPreview } from '../lib/saleTotals';

export interface SaleTotalsCardProps {
  totals: SaleTotalsPreview;
  currency: string;
}

const taxPercent = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 2,
});

function TotalRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-(--text-muted)">{label}</span>
      <span className="font-mono text-sm tabular-nums text-(--text-muted)">{value}</span>
    </div>
  );
}

/** Read-only subtotal, tax and total preview for the sale. */
export function SaleTotalsCard({ totals, currency }: SaleTotalsCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-(--border) bg-(--surface-secondary) p-2.5">
      <TotalRow label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
      <TotalRow
        label={`Tax (${taxPercent.format(totals.taxRate)})`}
        value={formatMoney(totals.taxAmount, currency)}
      />

      <div className="flex items-baseline justify-between gap-3 border-t border-(--border) pt-1">
        <p className="m-0 text-sm font-semibold text-(--text)">Total</p>
        <p className="m-0 font-mono text-sm font-semibold tabular-nums text-(--text)">
          {formatMoney(totals.total, currency)}
        </p>
      </div>
    </div>
  );
}
