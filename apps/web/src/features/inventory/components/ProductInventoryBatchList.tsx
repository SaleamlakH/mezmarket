import type { ProductInventoryBatchLineResponse } from '@mez/types';
import { Link, useLocation } from 'react-router';
import { Badge } from '@/components/Badge';
import { formatDate, formatMoney, formatQuantity, pluralize } from '@/lib/format';
import { daysSince, expiryState } from '../lib/productExpiry';
import type { ProductBatchLineRow } from '../lib/flattenProductBatchLines';
import { remainingValueOf } from '../lib/remainingValue';

export interface ProductInventoryBatchListProps {
  rows: ProductBatchLineRow[];
  currency: string;
  now: Date;
}

function ExpiryBadge({ line, now }: { line: ProductInventoryBatchLineResponse; now: Date }) {
  const expiryDate = line.expiryDate;
  if (!expiryDate) return <Badge tone="neutral">No expiry set</Badge>;

  const state = expiryState(line, now);

  if (state === 'expired') {
    const days = daysSince(expiryDate, now);
    return (
      <Badge tone="danger">
        Expired {days} {pluralize(days, 'day')} ago
      </Badge>
    );
  }
  if (state === 'soon') {
    const days = Math.max(0, -daysSince(expiryDate, now));
    return (
      <Badge tone="neutral">
        Expires in {days} {pluralize(days, 'day')} · {formatDate(expiryDate)}
      </Badge>
    );
  }
  return <Badge tone="neutral">Expires · {formatDate(expiryDate)}</Badge>;
}

function BatchLineRow({
  row,
  currency,
  now,
  from,
}: {
  row: ProductBatchLineRow;
  currency: string;
  now: Date;
  from: string;
}) {
  const { line } = row;

  return (
    <li className="border-t border-(--border) py-3">
      <div className="md:grid md:grid-cols-[1fr_minmax(0,18rem)_1fr] md:items-start md:gap-4">
        <div className="flex items-baseline justify-between gap-3 md:block">
          <div className="min-w-0">
            <Link
              to={`/inventory/batches/${row.batchId}`}
              state={{ from }}
              className="font-mono text-sm font-semibold text-(--text) hover:underline"
            >
              {row.referenceNumber ? `Batch #${row.referenceNumber}` : 'Batch'}
            </Link>
            <p className="m-0 text-xs text-(--text-muted)">{formatDate(row.batchDate)}</p>
          </div>

          <div className="shrink-0 text-right md:hidden">
            <p className="m-0 font-mono text-sm font-semibold tabular-nums text-(--text)">
              {formatMoney(remainingValueOf(line), currency)}
            </p>
            <p className="m-0 text-[11px] text-(--text-muted)">value on hand</p>
          </div>
        </div>

        <div className="mt-1.5 md:mt-0">
          <p className="m-0 text-sm text-(--text)">
            {formatQuantity(line.quantityRemaining)} of {formatQuantity(line.standardQuantity)}{' '}
            {line.standardUnit} remaining
          </p>
          <p className="m-0 mt-0.5 text-xs text-(--text-muted)">
            {formatQuantity(line.purchaseQuantity)} {line.purchaseUnit}
            {' × '}
            {formatMoney(line.purchaseUnitCost, currency, line.purchaseUnit)}
          </p>
          <div className="mt-2">
            <ExpiryBadge line={line} now={now} />
          </div>
        </div>

        <div className="hidden text-right md:block">
          <p className="m-0 font-mono text-sm font-semibold tabular-nums text-(--text)">
            {formatMoney(remainingValueOf(line), currency)}
          </p>
          <p className="m-0 text-[11px] text-(--text-muted)">value on hand</p>
        </div>
      </div>
    </li>
  );
}

/** Every line of the product's history, newest batch first, as the API returns. */
export function ProductInventoryBatchList({ rows, currency, now }: ProductInventoryBatchListProps) {
  const { pathname } = useLocation();

  return (
    <section
      aria-labelledby="product-batch-lines-title"
      className="rounded-xl border border-(--border) bg-(--surface-primary) p-4"
    >
      <h2 id="product-batch-lines-title" className="m-0 text-base font-medium text-(--text)">
        Batch lines
      </h2>
      <p className="m-0 mb-2 text-xs text-(--text-muted)">Newest batch first</p>

      <ul className="m-0 list-none p-0">
        {rows.map((row) => (
          <BatchLineRow key={row.line.id} row={row} currency={currency} now={now} from={pathname} />
        ))}
      </ul>
    </section>
  );
}
