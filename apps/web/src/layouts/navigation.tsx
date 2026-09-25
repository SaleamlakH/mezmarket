import type { ReactNode } from 'react';
import { LayoutGrid, Package, ShoppingCart, Warehouse } from 'lucide-react';

export type AppTabKey = 'dashboard' | 'products' | 'sales' | 'inventory';

export interface NavTab {
  key: AppTabKey;
  label: string;
  path: string;
  icon: ReactNode;
}

export const SIDEBAR_WIDTH_STYLE = { width: '16rem' };

export const NAV_TABS: NavTab[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: <LayoutGrid aria-hidden /> },
  { key: 'sales', label: 'Sales', path: '/sales', icon: <ShoppingCart aria-hidden /> },
  { key: 'inventory', label: 'Inventory', path: '/inventory', icon: <Warehouse aria-hidden /> },
  { key: 'products', label: 'Products', path: '/products', icon: <Package aria-hidden /> },
];
