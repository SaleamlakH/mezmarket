import type { StockBatchDetailResponse } from '@mez/types';
import { formatDate, formatDateTime, formatMoney, pluralize } from '@/lib/format';
import { batchTotal } from '../lib/batchTotal';

export interface BatchDetailSummaryCardProps {
  batch: StockBatchDetailResponse;
  currency: string;
}

/** One labelled fact in the summary, e.g. Supplier: Mango Wholesale. */
function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-sm">
      <span className="shrink-0 text-(--text-muted)">{label}</span>
      <span
        className={`min-w-0 truncate text-right ${value ? 'text-(--text)' : 'text-(--text-muted)'}`}
      >
        {value ?? '—'}
      </span>
    </div>
  );
}

/** The batch at a glance: what it came to, and who recorded it. */
export function BatchDetailSummaryCard({ batch, currency }: BatchDetailSummaryCardProps) {
  const productCount = new Set(batch.lines.map((line) => line.productId)).size;

  return (
    <aside className="rounded-xl border border-(--border) bg-(--surface-primary) p-4 shadow-(--shadow-sm)">
      <p className="m-0 text-sm text-(--text-muted)">Summary</p>
      <div className="mt-1">
        <span className="font-mono text-2xl font-semibold tabular-nums text-(--text)">
          {formatMoney(batchTotal(batch.lines), currency)}
        </span>
        <p className="m-0 mt-1 text-sm text-(--text-muted)">
          {batch.lines.length} {pluralize(batch.lines.length, 'line')}
          {' · '}
          {productCount} {pluralize(productCount, 'product')}
        </p>
      </div>

      <div className="mt-4 border-t border-(--border) pt-3">
        <DetailRow label="Supplier" value={batch.supplierName} />
        <DetailRow label="Reference" value={batch.referenceNumber} />
        <DetailRow label="Batch date" value={formatDate(batch.batchDate)} />
        <DetailRow label="Received by" value={batch.receivedBy?.name ?? null} />
        <DetailRow label="Confirmed" value={formatDateTime(batch.confirmedAt)} />
      </div>
    </aside>
  );
}
