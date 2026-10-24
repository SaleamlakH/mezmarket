import { useContext } from 'react';
import { InventoryFilterContext } from './context';
import type { InventoryFilterValue } from './types';

export function useInventoryFilterContext(): InventoryFilterValue {
  const context = useContext(InventoryFilterContext);
  if (!context) {
    throw new Error('useInventoryFilterContext must be used within an InventoryFilterProvider');
  }
  return context;
}
