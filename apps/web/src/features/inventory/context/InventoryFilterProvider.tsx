import { InventoryFilterContext } from './context';
import type { InventoryFilterProviderProps } from './types';
import { useInventoryFilter } from './useInventoryFilter';

export function InventoryFilterProvider({ children, now }: InventoryFilterProviderProps) {
  const value = useInventoryFilter(now);
  return <InventoryFilterContext value={value}>{children}</InventoryFilterContext>;
}
