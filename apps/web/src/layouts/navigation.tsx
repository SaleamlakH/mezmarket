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

export const SETTINGS_PATH = '/settings';
export const PROFILE_PATH = '/settings/profile';
export const INVENTORY_PATH = '/inventory';
export const BATCHES_PATH = '/inventory/batches';
export const PRODUCTS_PATH = '/products';
export const productDetailPath = (productId: string) => `${PRODUCTS_PATH}/${productId}`;
export const SALES_PATH = '/sales';
export const SALES_ALL_PATH = '/sales/all';

/** Where a product's inventory detail lives, for links into it. */
export const productInventoryPath = (productId: string) => `/inventory/products/${productId}`;

export const NAV_TABS: NavTab[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: <LayoutGrid aria-hidden /> },
  { key: 'sales', label: 'Sales', path: SALES_PATH, icon: <ShoppingCart aria-hidden /> },
  { key: 'inventory', label: 'Inventory', path: '/inventory', icon: <Warehouse aria-hidden /> },
  { key: 'products', label: 'Products', path: '/products', icon: <Package aria-hidden /> },
];
