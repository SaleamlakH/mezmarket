import { createContext } from 'react';
import type { InventoryFilterValue } from './types';

export const InventoryFilterContext = createContext<InventoryFilterValue | null>(null);
