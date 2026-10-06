import type { BatchLineFormValues, ProductSummaryResponse } from '@mez/types';
import { X } from 'lucide-react';
import { IconButton } from '@/components/IconButton';
import { formatDate, formatMoney } from '@/lib/format';
import { lineTotal } from '../lib/lineTotal';
import type { PurchasableUnitsByProduct } from '../data/fixtures';

export interface BatchLineListProps {
  lines: BatchLineFormValues[];
  products: ProductSummaryResponse[];
  unitsByProductId: PurchasableUnitsByProduct;
  currency: string;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

/**
 * The batch's product lines once added, as plain rows stacked one under the
 * next and separated by a rule — no card around each one, so the list reads as
 * one block rather than a pile of boxes. Tapping a row opens that line's
 * fields again.
 */
export function BatchLineList({
  lines,
  products,
  unitsByProductId,
  currency,
  onEdit,
  onRemove,
}: BatchLineListProps) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {lines.map((line, index) => {
        const product = products.find((entry) => entry.id === line.productId);
        const productName = product?.name ?? 'Unknown product';
        const unit = unitsByProductId[line.productId]?.find(
          (entry) => entry.id === line.productUnitId,
        );
        const quantity = line.purchaseQuantity.trim();
        const cost = Number(line.purchaseUnitCost);
        const costLabel = Number.isFinite(cost)
          ? formatMoney(cost, currency)
          : line.purchaseUnitCost;
        const total = lineTotal(line);

        return (
          <li
            key={`${line.productId}-${index}`}
            className="flex items-center gap-1 border-b border-(--border) pr-1 pl-2 transition-colors last:border-b-0 hover:bg-(--surface-secondary)"
          >
            <button
              type="button"
              onClick={() => onEdit(index)}
              className="focus-ring flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-(--text)">
                  {productName}
                </span>
                <span className="mt-1 block truncate font-mono text-xs text-(--text-muted)">
                  {quantity === '' ? 'No quantity' : `${quantity} ${unit?.name ?? 'unit'}`}
                </span>
                {line.expiryDate && (
                  <span className="mt-1 block text-xs text-(--text-muted)">
                    Expires {formatDate(line.expiryDate)}
                  </span>
                )}
              </span>

              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm font-semibold tabular-nums text-(--text)">
                  {total === null ? '—' : formatMoney(total, currency)}
                </span>
                <span className="mt-1 block text-xs whitespace-nowrap text-(--text-muted)">
                  {costLabel} / {unit?.name ?? 'unit'}
                </span>
              </span>
            </button>

            <IconButton
              label={`Remove ${productName}`}
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
