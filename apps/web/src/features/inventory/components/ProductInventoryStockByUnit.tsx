import { formatQuantity, pluralize } from '@/lib/format';
import type { UnitStockGroup } from '../lib/groupLinesByUnit';

export interface ProductInventoryStockByUnitProps {
  groups: UnitStockGroup[];
}

/**
 * What the product physically holds, grouped by the unit it was bought in. A
 * non-base unit shows both how many of it are left and the base-unit total;
 * the base unit itself shows only the total so it is not repeated.
 */
export function ProductInventoryStockByUnit({ groups }: ProductInventoryStockByUnitProps) {
  if (groups.length === 0) return null;

  return (
    <section
      aria-labelledby="stock-by-unit-title"
      className="rounded-xl border border-(--border) bg-(--surface-primary) p-4"
    >
      <h2 id="stock-by-unit-title" className="m-0 mb-2 text-base font-medium text-(--text)">
        Stock by unit
      </h2>

      <ul className="m-0 list-none p-0">
        {groups.map((group) => (
          <li
            key={group.purchaseUnit}
            className="flex items-baseline justify-between gap-3 border-t border-(--border) py-2"
          >
            <span className="min-w-0 truncate text-sm text-(--text)">{group.purchaseUnit}</span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="font-mono text-sm tabular-nums text-(--text)">
                {group.purchaseUnit === group.baseUnit
                  ? `${formatQuantity(group.baseQuantityRemaining)} ${group.baseUnit}`
                  : `${formatQuantity(group.purchaseUnitRemaining)} ${group.purchaseUnit} · ${formatQuantity(group.baseQuantityRemaining)} ${group.baseUnit}`}
              </span>
              <span className="hidden text-xs text-(--text-muted) md:inline">
                · {group.lineCount} {pluralize(group.lineCount, 'line')}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
