import type { ProductSummaryResponse, SaleLineFormValues } from '@mez/types';
import { X } from 'lucide-react';
import { Button } from '@/components/Button';
import { formatMoney } from '@/lib/format';
import { useSaleLineList } from '../hooks/useSaleLineList';

export interface SaleLineListProps {
  lines: SaleLineFormValues[];
  currency: string;
  onEdit: (index: number, product: ProductSummaryResponse) => void;
  onRemove: (index: number) => void;
}

/** The added lines as plain rows; tapping one reopens its fields. */
export function SaleLineList({ lines, currency, onEdit, onRemove }: SaleLineListProps) {
  const { rows } = useSaleLineList(lines);

  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((row, index) => {
        const productName = row.product?.name ?? 'Unknown product';
        const unitName = row.unit?.name ?? 'unit';
        const quantity = row.line.quantity.trim();

        return (
          <li
            key={`${row.line.productId}-${index}`}
            className="flex items-center gap-2 border-b border-(--border) pr-1 pl-2 transition-colors last:border-b-0 hover:bg-(--surface-secondary)"
          >
            <button
              type="button"
              onClick={() => {
                if (row.product) onEdit(index, row.product);
              }}
              className="focus-ring flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-(--text)">
                  {productName}
                </span>
                <span className="mt-1 block truncate font-mono text-xs text-(--text-muted)">
                  {quantity === '' ? 'No quantity' : `${quantity} ${unitName}`}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm font-semibold tabular-nums text-(--text)">
                  {row.total === null ? '—' : formatMoney(row.total, currency)}
                </span>
                <span className="mt-1 block text-xs whitespace-nowrap text-(--text-muted)">
                  {row.unitPrice === null ? 'No price' : formatMoney(row.unitPrice, currency)} /{' '}
                  {unitName}
                </span>
              </span>
            </button>

            <Button
              type="button"
              shape="square"
              size="md"
              variant="field"
              aria-label={`Remove ${productName}`}
              title={`Remove ${productName}`}
              onClick={() => onRemove(index)}
              className="border-transparent bg-transparent hover:border-(--border) hover:bg-(--surface-secondary) hover:text-(--danger)"
            >
              <X size={15} aria-hidden />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
