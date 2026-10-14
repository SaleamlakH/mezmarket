import type { ProductUnitOptionResponse } from '@mez/types';
import { Stepper } from '@/components/Stepper';
import { formatMoney } from '@/lib/format';
import type { SaleDraftLine } from '../state/saleDraft';

export interface ProductLinesSummaryProps {
  units: ProductUnitOptionResponse[];
  lines: SaleDraftLine[];
  currency: string;
  /** When given, each line gets a compact stepper to adjust its quantity. */
  onQuantityChange?: ((lineId: string, quantity: number) => void) | undefined;
}

/**
 * The running list of a product's committed lines with per-line totals, plus a
 * grand total and a hint when nothing has been added yet. Shared by the mobile
 * sheet, the desktop popover, and the inline editor on the sale panel.
 */
export function ProductLinesSummary({
  units,
  lines,
  currency,
  onQuantityChange,
}: ProductLinesSummaryProps) {
  const committed = lines.filter((line) => line.quantity > 0);
  const total = committed.reduce((sum, line) => {
    const unit = units.find((entry) => entry.id === line.productUnitId);
    return unit?.price != null ? sum + unit.price * line.quantity : sum;
  }, 0);

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
              const unit = units.find((entry) => entry.id === line.productUnitId);
              const lineTotal =
                unit?.price == null ? null : formatMoney(unit.price * line.quantity, currency);

              return (
                <li key={line.id} className="flex items-center gap-3 py-1">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate font-mono text-xs text-(--text-muted)">
                      {unit?.name ?? 'unit'}
                    </p>
                    <p className="m-0 font-mono text-xs tabular-nums text-(--text)">
                      {lineTotal ?? 'No price'}
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
