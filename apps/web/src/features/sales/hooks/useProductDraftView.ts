import { useCallback, useMemo, useState } from 'react';
import type { ProductSummaryResponse, ProductUnitOptionResponse } from '@mez/types';
import { useBusinessProducts, useProductUnits } from '@/hooks/useCatalogApi';
import { buildCartItem, catalogForProduct, type CartItem } from '../lib/saleDraftView';
import { isCommitted, type SaleDraftLine } from '../state/saleDraft';
import { useSaleDraft } from '../state/useSaleDraft';

const NO_UNITS: ProductUnitOptionResponse[] = [];

/** One product's slice of the draft: its catalog entry, units and held lines. */
export interface ProductDraftView {
  product: ProductSummaryResponse | undefined;
  units: ProductUnitOptionResponse[];
  /** A units request is in flight. */
  unitsLoading: boolean;
  /** The units request has settled, so an empty `units` means the product has none. */
  unitsReady: boolean;
  /** Asks for the product's units — the unit selector's first touch calls it. */
  requestUnits: () => void;
  /** Every line held for the product, committed or not. */
  lines: SaleDraftLine[];
  /** The committed lines, joined and totalled — the product's cart item. */
  cartItem: CartItem;
  /** The line the product's editor edits, when the product is the active one. */
  activeLine: SaleDraftLine | undefined;
  /** Whether this product is the one whose controls are open. */
  isActive: boolean;
}

/**
 * The one-product slice of the draft — shared by the grid card and the docked
 * line editor. Units are requested only once the unit selector is reached or a
 * line holds a quantity.
 */
export function useProductDraftView(productId: string): ProductDraftView {
  const { activeProductId, activeLineId, linesForProduct } = useSaleDraft();
  const { data: products = [] } = useBusinessProducts();

  const productLines = useMemo(() => linesForProduct(productId), [linesForProduct, productId]);
  const hasCommittedLines = productLines.some(isCommitted);

  const [unitsWanted, setUnitsWanted] = useState(false);
  const unitsQuery = useProductUnits(productId, { enabled: unitsWanted || hasCommittedLines });
  const units = unitsQuery.data ?? NO_UNITS;
  const requestUnits = useCallback(() => setUnitsWanted(true), []);
  const isActive = activeProductId === productId;

  return useMemo(() => {
    const product = products.find((entry) => entry.id === productId);

    return {
      product,
      units,
      unitsLoading: unitsQuery.isFetching,
      unitsReady: unitsQuery.isSuccess,
      requestUnits,
      lines: productLines,
      cartItem: buildCartItem(
        productLines,
        productId,
        catalogForProduct(productId, product, units),
      ),
      activeLine: isActive ? productLines.find((line) => line.id === activeLineId) : undefined,
      isActive,
    };
  }, [
    productId,
    products,
    units,
    unitsQuery.isFetching,
    unitsQuery.isSuccess,
    requestUnits,
    productLines,
    isActive,
    activeLineId,
  ]);
}
