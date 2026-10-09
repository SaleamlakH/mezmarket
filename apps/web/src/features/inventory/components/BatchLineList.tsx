import type { BatchLineFormValues, DownloadUrlsResponse, ProductSummaryResponse } from '@mez/types';
import { X } from 'lucide-react';
import { IconButton } from '@/components/IconButton';
import { ProductThumb } from '@/components/ProductThumb';
import { formatDate, formatMoney } from '@/lib/format';
import { useBatchLineList } from '../hooks/useBatchLineList';
import { lineTotal } from '../lib/lineTotal';

export interface BatchLineListProps {
  lines: BatchLineFormValues[];
  currency: string;
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  onEdit: (index: number, product: ProductSummaryResponse) => void;
  onRemove: (index: number) => void;
}

/**
 * The batch's product lines once added, as plain rows stacked one under the
 * next and separated by a rule — no card around each one, so the list reads as
 * one block rather than a pile of boxes. Tapping a row opens that line's
 * fields again. Names come from the query cache via `useBatchLineList` —
 * the add-batch session already fetched them.
 */
export function BatchLineList({
  lines,
  currency,
  businessId,
  uploadUrls,
  onEdit,
  onRemove,
}: BatchLineListProps) {
  const { cachedProducts, unitsByProductId } = useBatchLineList(lines);

  const rowFor = (line: BatchLineFormValues) => {
    const product = cachedProducts?.find((entry) => entry.id === line.productId);
    const unit = unitsByProductId[line.productId]?.find((entry) => entry.id === line.productUnitId);
    const quantity = line.purchaseQuantity.trim();
    const cost = Number(line.purchaseUnitCost);
    return {
      product,
      productName: product?.name ?? 'Unknown product',
      unitName: unit?.name ?? 'unit',
      quantity,
      costLabel: Number.isFinite(cost) ? formatMoney(cost, currency) : line.purchaseUnitCost,
      total: lineTotal(line),
    };
  };

  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {lines.map((line, index) => {
        const row = rowFor(line);

        return (
          <li
            key={`${line.productId}-${index}`}
            className="flex items-center gap-2 border-b border-(--border) pr-1 pl-2 transition-colors last:border-b-0 hover:bg-(--surface-secondary)"
          >
            {row.product && (
              <ProductThumb
                businessId={businessId}
                uploadId={row.product.uploadId}
                uploadUrls={uploadUrls}
                alt={row.productName}
                size={36}
              />
            )}
            <button
              type="button"
              onClick={() => {
                if (row.product) onEdit(index, row.product);
              }}
              className="focus-ring flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-(--text)">
                  {row.productName}
                </span>
                <span className="mt-1 block truncate font-mono text-xs text-(--text-muted)">
                  {row.quantity === '' ? 'No quantity' : `${row.quantity} ${row.unitName}`}
                </span>
                {line.expiryDate && (
                  <span className="mt-1 block text-xs text-(--text-muted)">
                    Expires {formatDate(line.expiryDate)}
                  </span>
                )}
              </span>

              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm font-semibold tabular-nums text-(--text)">
                  {row.total === null ? '—' : formatMoney(row.total, currency)}
                </span>
                <span className="mt-1 block text-xs whitespace-nowrap text-(--text-muted)">
                  {row.costLabel} / {row.unitName}
                </span>
              </span>
            </button>

            <IconButton
              label={`Remove ${row.productName}`}
              icon={<X size={15} aria-hidden />}
              onClick={() => onRemove(index)}
              className="h-8 w-8 border-transparent bg-transparent hover:border-(--border) hover:bg-(--surface-secondary) hover:text-(--danger)"
            />
          </li>
        );
      })}
    </ul>
  );
}
