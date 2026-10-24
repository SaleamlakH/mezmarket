import type { BadgeTone } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import { INVENTORY_FILTER_OPTIONS, type InventoryFilterKind } from '../lib/inventoryFilters';

const TONES: Record<InventoryFilterKind, BadgeTone> = {
  all: 'accent',
  low: 'warning',
  expiring: 'warning',
  expired: 'danger',
};

export interface ProductStockFiltersProps {
  activeKind: InventoryFilterKind | null;
  onSelect: (kind: InventoryFilterKind) => void;
}

export function ProductStockFilters({ activeKind, onSelect }: ProductStockFiltersProps) {
  return (
    <div
      role="group"
      aria-label="Filter products"
      className="scrollbar-none flex gap-1.5 overflow-x-auto pb-0.5"
    >
      {INVENTORY_FILTER_OPTIONS.map((option) => {
        const active = activeKind === option.kind;

        return (
          <button
            key={option.kind}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(option.kind)}
            className="focus-ring shrink-0 cursor-pointer rounded-lg"
          >
            <Chip active={active} tone={TONES[option.kind]}>
              {option.label}
            </Chip>
          </button>
        );
      })}
    </div>
  );
}
