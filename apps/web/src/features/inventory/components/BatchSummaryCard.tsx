import type { StockBatchDetailResponse } from '@mez/types';
import { formatDate, formatMoney } from '@/lib/format';

/** How many product lines a tile names before the rest collapse into a count. */
const PREVIEW_COUNT = 2;

export interface BatchSummaryCardProps {
  batch: StockBatchDetailResponse;
  currency: string;
  /** Lets the page drop tiles it has no room for at the current width. */
  className?: string | undefined;
}

/**
 * What the batch came to: every line's quantity multiplied by what a single
 * unit of it cost. A batch carries no total of its own, so the tile derives it
 * the same way the endpoint's line detail already lets it.
 */
function batchTotal(lines: StockBatchDetailResponse['lines']): number {
  return lines.reduce((total, line) => total + line.purchaseQuantity * line.purchaseUnitCost, 0);
}

export function BatchSummaryCard({ batch, currency, className = '' }: BatchSummaryCardProps) {
  const previewed = batch.lines.slice(0, PREVIEW_COUNT);
  const remaining = batch.lines.length - previewed.length;

  return (
    <article
      className={`flex flex-col rounded-xl border border-(--border) bg-(--surface-primary) p-3.5 ${className}`}
    >
      <p className="m-0 text-xs whitespace-nowrap text-(--text-muted)">
        {formatDate(batch.batchDate)}
      </p>

      <div className="mt-2 mb-2 flex min-h-10 items-start gap-1.5">
        <p className="m-0 min-w-0 line-clamp-2 text-balance text-sm leading-5 font-semibold text-(--text)">
          {previewed.length === 0
            ? 'No product lines'
            : previewed.map((line, index) => (
                <span key={`${line.productId}-${index}`}>
                  {index > 0 && ', '}
                  {line.productName}
                </span>
              ))}
        </p>

        {remaining > 0 && (
          <span className="shrink-0 rounded-md border border-(--border) bg-(--surface-secondary) px-2 py-0.5 text-xs leading-4 font-semibold whitespace-nowrap text-(--text)">
            +{remaining}
            <span className="sr-only"> more product lines</span>
          </span>
        )}
      </div>

      <div className="mt-auto border-t border-(--border) pt-2.5">
        <p className="m-0 font-mono text-sm font-semibold whitespace-nowrap tabular-nums text-(--text)">
          {formatMoney(batchTotal(batch.lines), currency)}
        </p>
        <p className="m-0 mt-1 truncate text-xs text-(--text-muted)">
          {batch.receivedBy?.name ?? 'No receiver recorded'}
        </p>
      </div>
    </article>
  );
}
