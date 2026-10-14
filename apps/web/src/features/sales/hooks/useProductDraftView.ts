import { useMemo } from 'react';
import type { ProductSummaryResponse, ProductUnitOptionResponse } from '@mez/types';
import { buildCartItem, productForId, unitsForProduct, type CartItem } from '../lib/saleDraftView';
import type { SaleDraftLine } from '../state/saleDraft';
import { useSaleDraft } from '../state/useSaleDraft';

/** One product's slice of the draft: its catalog entry, units and held lines. */
export interface ProductDraftView {
  product: ProductSummaryResponse | undefined;
  units: ProductUnitOptionResponse[];
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
 * The draft read model for a single product, shared by the grid card and the
 * docked line editor so the fixture join and committed totals live once.
 */
export function useProductDraftView(productId: string): ProductDraftView {
  const { activeProductId, activeLineId, linesForProduct } = useSaleDraft();

  return useMemo(() => {
    const productLines = linesForProduct(productId);
    const isActive = activeProductId === productId;

    return {
      product: productForId(productId),
      units: unitsForProduct(productId),
      lines: productLines,
      cartItem: buildCartItem(productLines, productId),
      activeLine: isActive ? productLines.find((line) => line.id === activeLineId) : undefined,
      isActive,
    };
  }, [productId, activeProductId, activeLineId, linesForProduct]);
}
