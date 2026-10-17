import type { ProductUnitOptionResponse } from '@mez/types';
import { X } from 'lucide-react';
import { Button } from '@/components/Button';
import { Stepper } from '@/components/Stepper';
import { formatMoney } from '@/lib/format';
import { lineAmount } from '@/lib/lineTotal';
import { isCommitted, type SaleDraftLine } from '../state/saleDraft';

export interface CartItemLinesProps {
  units: ProductUnitOptionResponse[];
  lines: SaleDraftLine[];
  currency: string;
  /** When given, each line gets a compact stepper to adjust its quantity. */
  onQuantityChange?: ((lineId: string, quantity: number) => void) | undefined;
  /** When given, each line gets a control to drop it from the sale. */
  onRemove?: ((lineId: string) => void) | undefined;
}

/** A product's committed lines with per-line totals and a grand total. */
export function CartItemLines({
  units,
  lines,
  currency,
  onQuantityChange,
  onRemove,
}: CartItemLinesProps) {
  const unitOf = (line: SaleDraftLine) => units.find((entry) => entry.id === line.productUnitId);
  const committed = lines.filter(isCommitted);
  const total = committed.reduce(
    (sum, line) => sum + (lineAmount(line.quantity, unitOf(line)?.price ?? null) ?? 0),
    0,
  );

  return (
    <div className="rounded-xl border border-(--border-strong) bg-(--surface-primary) px-3 py-1.5">
      {committed.length === 0 ? (
        <p className="m-0 py-1 text-xs text-(--text-muted)">
          Pick a unit and set a quantity to add a line.
        </p>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col p-0">
            {committed.map((line) => {
              const unit = unitOf(line);
              const amount = lineAmount(line.quantity, unit?.price ?? null);

              return (
                <li key={line.id} className="flex items-center gap-3 py-1">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate font-mono text-xs text-(--text-muted)">
                      {unit?.name ?? 'unit'}
                    </p>
                    <p className="m-0 font-mono text-xs tabular-nums text-(--text)">
                      {amount == null ? 'No price' : formatMoney(amount, currency)}
                    </p>
                  </div>

                  {onQuantityChange && (
                    <div className="w-24 shrink-0">
                      <Stepper
                        size="sm"
                        variant="text"
                        value={line.quantity}
                        onChange={(quantity) => onQuantityChange(line.id, quantity)}
                      />
                    </div>
                  )}

                  {onRemove && (
                    <Button
                      type="button"
                      shape="square"
                      size="md"
                      variant="field"
                      aria-label={`Remove ${unit?.name ?? 'unit'} line`}
                      title={`Remove ${unit?.name ?? 'unit'} line`}
                      onClick={() => onRemove(line.id)}
                    >
                      <X size={14} aria-hidden />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-(--border) pt-2">
            <span className="text-xs font-bold text-(--text)">Total</span>
            <span className="font-mono text-sm font-bold tabular-nums text-(--text)">
              {formatMoney(total, currency)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
