import { useMemo } from 'react';
import { buildCartItems, type CartItem } from '../lib/saleDraftView';
import { useSaleDraft } from '../state/useSaleDraft';

export type { CartItemLine, CartItem } from '../lib/saleDraftView';

export interface SaleDraftView {
  cartItems: CartItem[];
  /** How many committed lines the sale holds. */
  itemCount: number;
  total: number;
  hasLines: boolean;
}

/**
 * The committed lines of the new-sale draft — those holding a quantity — joined
 * with the product and unit each is sold in and grouped into cart items by
 * product, in insertion order. This is the read model the sale panel and the
 * mobile review sheet share.
 *
 * The catalog is read from the runtime fixture for now; this is where the
 * API-backed products and units swap in later.
 */
export function useSaleDraftView(): SaleDraftView {
  const { lines } = useSaleDraft();

  return useMemo(() => {
    const cartItems = buildCartItems(lines);
    const itemCount = cartItems.reduce((sum, item) => sum + item.lines.length, 0);
    const total = cartItems.reduce((sum, item) => sum + item.total, 0);

    return { cartItems, itemCount, total, hasLines: cartItems.length > 0 };
  }, [lines]);
}
