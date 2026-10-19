import type { StockBatchDetailResponse } from '@mez/types';
import { Link } from 'react-router';
import { RailCard } from '@/components/RailCard';
import { useForwardNavigationState } from '@/layouts/useNavigationHistory';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { batchTotal } from '../lib/batchTotal';

/** How many product lines a tile names before the rest collapse into a count. */
const PREVIEW_COUNT = 2;

export interface BatchSummaryCardProps {
  batch: StockBatchDetailResponse;
  currency: string;
  /** Lets the page drop tiles it has no room for at the current width. */
  className?: string | undefined;
}

export function BatchSummaryCard({ batch, currency, className = '' }: BatchSummaryCardProps) {
  const previewed = batch.lines.slice(0, PREVIEW_COUNT);
  const remaining = batch.lines.length - previewed.length;
  const forwardState = useForwardNavigationState();

  return (
    <article className={className}>
      <Link to={`/inventory/batches/${batch.id}`} state={forwardState} className="block h-full">
        <RailCard
          className="h-full"
          footer={
            <>
              <p className="m-0 font-mono text-sm font-semibold whitespace-nowrap tabular-nums text-(--text)">
                {formatMoney(batchTotal(batch.lines), currency)}
              </p>
              <p className="m-0 truncate text-xs text-(--text-muted)">
                {batch.receivedBy?.name ?? 'No receiver recorded'}
              </p>
            </>
          }
        >
          <div className="space-y-0.5 text-xs leading-tight whitespace-nowrap text-(--text-muted)">
            <p className="m-0">{formatDate(batch.batchDate)}</p>
            <p className="m-0 tabular-nums">{formatTime(batch.batchDate)}</p>
          </div>

          <div className="mt-1 flex min-h-10 items-start gap-1.5">
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
        </RailCard>
      </Link>
    </article>
  );
}
