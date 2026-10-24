import type { ReactNode } from 'react';
import type { ProductInventoryListFilters } from '@mez/types';
import type { InventoryFilterKind } from '../lib/inventoryFilters';

export interface InventoryFilterValue {
  filters: ProductInventoryListFilters;
  activeKind: InventoryFilterKind | null;
  selectFilter: (kind: InventoryFilterKind) => void;
}

export interface InventoryFilterProviderProps {
  children: ReactNode;
  now?: Date;
}
