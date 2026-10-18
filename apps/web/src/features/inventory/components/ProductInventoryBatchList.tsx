import { useState } from 'react';
import type { ProductInventoryBatchLineResponse, ProductInventoryBatchResponse } from '@mez/types';
import { ClipboardList } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Badge, type BadgeSurface } from '@/components/Badge';
import { SectionHeader } from '@/components/SectionHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from '@/components/Table';
import { formatDate, formatMoney, formatQuantity } from '@/lib/format';
import { lineAmount } from '@/lib/lineTotal';
import { expiryState } from '../lib/productExpiry';

export interface ProductInventoryBatchListProps {
  batches: ProductInventoryBatchResponse[];
  currency: string;
  now: Date;
}

function ExpiryBadge({
  line,
  now,
  surface = 'secondary',
}: {
  line: ProductInventoryBatchLineResponse;
  now: Date;
  surface?: BadgeSurface;
}) {
  const expiryDate = line.expiryDate;
  if (!expiryDate) return null;

  const expired = expiryState(line, now) === 'expired';

  return (
    <Badge tone={expired ? 'danger' : 'neutral'} surface={surface}>
      {expired ? 'Expired' : 'Expires'} · {formatDate(expiryDate)}
    </Badge>
  );
}

function remainingQuantity(line: ProductInventoryBatchLineResponse) {
  return line.purchaseUnit === line.baseUnit
    ? `${formatQuantity(line.quantityRemaining)} ${line.baseUnit}`
    : `${formatQuantity(line.remainingPurchaseQuantity)} ${line.purchaseUnit} · ${formatQuantity(line.quantityRemaining)} ${line.baseUnit}`;
}

function BatchLineRow({
  line,
  currency,
  now,
}: {
  line: ProductInventoryBatchLineResponse;
  currency: string;
  now: Date;
}) {
  const remaining = `${remainingQuantity(line)} remaining`;

  return (
    <li className="px-3 py-2.5 text-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-(--text)">
          {formatQuantity(line.purchaseQuantity)} {line.purchaseUnit}
          {' × '}
          {formatMoney(line.purchaseUnitCost, currency, line.purchaseUnit)}
        </span>
        <span className="shrink-0 font-mono tabular-nums text-(--text)">
          {formatMoney(lineAmount(line.purchaseQuantity, line.purchaseUnitCost), currency)}
        </span>
      </div>

      <div className="mt-0.5 flex items-baseline justify-between gap-3 text-xs text-(--text-muted)">
        <span>Value on hand</span>
        <span className="font-mono tabular-nums">{formatMoney(line.remainingCost, currency)}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-md border border-(--border) bg-(--surface-primary) px-2.5 py-1 text-xs font-semibold tabular-nums text-(--text)">
          {remaining}
        </span>
        <ExpiryBadge line={line} now={now} surface="primary" />
      </div>
    </li>
  );
}

function BatchTable({
  batches,
  currency,
  now,
  from,
}: ProductInventoryBatchListProps & { from: string }) {
  const [hoveredBatchId, setHoveredBatchId] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeadCell>Batch</TableHeadCell>
          <TableHeadCell>Purchased</TableHeadCell>
          <TableHeadCell className="text-right">Total</TableHeadCell>
          <TableHeadCell className="text-right">Value on hand</TableHeadCell>
          <TableHeadCell>Remaining</TableHeadCell>
          <TableHeadCell>Expiry</TableHeadCell>
        </TableRow>
      </TableHead>

      {batches.map((batch) => {
        const openBatch = () => navigate(`/inventory/batches/${batch.id}`, { state: { from } });
        const cellClass = `transition-colors ${hoveredBatchId === batch.id ? 'bg-(--field)' : ''}`;

        return (
          <TableBody key={batch.id}>
            {batch.lines.map((line, index) => (
              <tr
                key={line.id}
                onMouseEnter={() => setHoveredBatchId(batch.id)}
                onMouseLeave={() => setHoveredBatchId(null)}
                onClick={openBatch}
                className="cursor-pointer"
              >
                {index === 0 && (
                  <TableHeadCell
                    variant="row"
                    rowSpan={batch.lines.length}
                    className={`align-top whitespace-nowrap ${cellClass}`}
                  >
                    <Link
                      to={`/inventory/batches/${batch.id}`}
                      state={{ from }}
                      onClick={(event) => event.stopPropagation()}
                      className="font-mono text-sm font-semibold text-(--accent) hover:text-(--accent-hover) hover:underline"
                    >
                      {batch.referenceNumber ? `Batch #${batch.referenceNumber}` : 'Batch'}
                    </Link>
                    <p className="m-0 text-xs text-(--text-muted)">{formatDate(batch.batchDate)}</p>
                    {batch.supplierName && (
                      <p className="m-0 text-xs text-(--text-muted)">{batch.supplierName}</p>
                    )}
                  </TableHeadCell>
                )}
                <TableCell className={`whitespace-nowrap ${cellClass}`}>
                  <span className="font-mono tabular-nums text-(--text)">
                    {formatQuantity(line.purchaseQuantity)} {line.purchaseUnit}
                  </span>
                  <span className="ml-1 text-xs text-(--text-muted)">
                    × {formatMoney(line.purchaseUnitCost, currency, line.purchaseUnit)}
                  </span>
                </TableCell>
                <TableCell className={`text-right font-mono tabular-nums ${cellClass}`}>
                  {formatMoney(lineAmount(line.purchaseQuantity, line.purchaseUnitCost), currency)}
                </TableCell>
                <TableCell className={`text-right font-mono tabular-nums ${cellClass}`}>
                  {formatMoney(line.remainingCost, currency)}
                </TableCell>
                <TableCell
                  className={`whitespace-nowrap font-mono text-sm tabular-nums text-(--text) ${cellClass}`}
                >
                  {remainingQuantity(line)}
                </TableCell>
                <TableCell className={cellClass}>
                  <ExpiryBadge line={line} now={now} />
                </TableCell>
              </tr>
            ))}
          </TableBody>
        );
      })}
    </Table>
  );
}

/** The product's history, grouped under the batch each line arrived in. */
export function ProductInventoryBatchList({
  batches,
  currency,
  now,
}: ProductInventoryBatchListProps) {
  const { pathname } = useLocation();

  return (
    <section aria-label="Batch lines">
      <SectionHeader icon={<ClipboardList size={14} aria-hidden />} title="Batch lines" />

      <div className="hidden md:block">
        <BatchTable batches={batches} currency={currency} now={now} from={pathname} />
      </div>

      <div className="rounded-xl border border-(--border) bg-(--surface-primary) py-4 md:hidden">
        {batches.map((batch) => (
          <div key={batch.id} className="border-b border-(--border) py-3 last:border-0">
            <div className="flex items-baseline justify-between gap-3 px-4">
              <div className="min-w-0">
                <Link
                  to={`/inventory/batches/${batch.id}`}
                  state={{ from: pathname }}
                  className="font-mono text-xl font-semibold text-(--accent) hover:text-(--accent-hover) hover:underline"
                >
                  {batch.referenceNumber ? `Batch #${batch.referenceNumber}` : 'Batch'}
                </Link>
                <p className="m-0 text-xs text-(--text-muted)">
                  {formatDate(batch.batchDate)}
                  {batch.supplierName && ` · ${batch.supplierName}`}
                </p>
              </div>
            </div>

            <ul className="m-0 mt-2 list-none divide-y divide-(--border) overflow-hidden border border-(--border) bg-(--surface-secondary) p-0">
              {batch.lines.map((line) => (
                <BatchLineRow key={line.id} line={line} currency={currency} now={now} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
