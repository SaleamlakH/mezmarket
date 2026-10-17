import { useMemo } from 'react';
import { buildCartItems, type CartItem } from '../lib/saleDraftView';
import { useSaleDraft } from '../state/useSaleDraft';
import { useDraftCatalog } from './useDraftCatalog';

export type { CartItemLine, CartItem } from '../lib/saleDraftView';

export interface SaleDraftView {
  cartItems: CartItem[];
  /** How many committed lines the sale holds. */
  itemCount: number;
  total: number;
  hasLines: boolean;
}

/**
 * The draft's committed lines joined with the catalog and grouped into cart
 * items — the shared read model of the sale panel and the review sheet.
 */
export function useSaleDraftView(): SaleDraftView {
  const { lines } = useSaleDraft();
  const catalog = useDraftCatalog(lines);

  return useMemo(() => {
    const cartItems = buildCartItems(lines, catalog);
    const itemCount = cartItems.reduce((sum, item) => sum + item.lines.length, 0);
    const total = cartItems.reduce((sum, item) => sum + item.total, 0);

    return { cartItems, itemCount, total, hasLines: cartItems.length > 0 };
  }, [lines, catalog]);
}
