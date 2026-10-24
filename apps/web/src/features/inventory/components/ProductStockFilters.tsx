import { useState } from 'react';
import type { ProductInventoryListFilters } from '@mez/types';
import type { BadgeTone } from '@/components/Badge';
import { Dialog, DialogHeader } from '@/components/Dialog';
import { FilterBar, FilterOption, type ActiveFilterChip } from '@/components/FilterBar';
import { INVENTORY_FILTER_OPTIONS, type InventoryFilterKind } from '../lib/inventoryFilters';

const TONES: Record<InventoryFilterKind, BadgeTone> = {
  all: 'accent',
  low: 'warning',
  expiring: 'warning',
  expired: 'danger',
};

export interface ProductStockFiltersProps {
  filters: ProductInventoryListFilters;
  activeKind: InventoryFilterKind | null;
  onSelect: (kind: InventoryFilterKind) => void;
  onRemove: (kind: Exclude<InventoryFilterKind, 'all'>) => void;
}

export function ProductStockFilters({
  filters,
  activeKind,
  onSelect,
  onRemove,
}: ProductStockFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFilters: ActiveFilterChip[] = [];

  if (filters.stockStatus?.some((status) => status === 'LOW_STOCK' || status === 'OUT_OF_STOCK')) {
    activeFilters.push({
      key: 'low',
      label: 'Low & out',
      tone: TONES.low,
      onRemove: () => onRemove('low'),
    });
  }

  if (filters.expiryStatus?.includes('expired')) {
    activeFilters.push({
      key: 'expired',
      label: 'Expired',
      tone: TONES.expired,
      onRemove: () => onRemove('expired'),
    });
  }

  if (filters.expiryStatus?.includes('soon')) {
    activeFilters.push({
      key: 'expiring',
      label: 'Expiring (30 days)',
      tone: TONES.expiring,
      onRemove: () => onRemove('expiring'),
    });
  }

  return (
    <>
      <FilterBar activeFilters={activeFilters} onOpen={() => setOpen(true)} />

      <Dialog open={open} onClose={() => setOpen(false)} size="md">
        <DialogHeader title="Filter products" onClose={() => setOpen(false)} />
        <div className="flex flex-col gap-2 pb-4">
          {INVENTORY_FILTER_OPTIONS.map((option) => (
            <FilterOption
              key={option.kind}
              active={activeKind === option.kind}
              tone={TONES[option.kind]}
              onClick={() => {
                onSelect(option.kind);
                setOpen(false);
              }}
            >
              {option.label}
            </FilterOption>
          ))}
        </div>
      </Dialog>
    </>
  );
}
