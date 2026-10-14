import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SaleDraftProvider } from '../../state/SaleDraftProvider';
import { useSaleDraft } from '../../state/useSaleDraft';
import { useProductDraftView } from '../useProductDraftView';

function render(productId: string) {
  return renderHook(() => ({ draft: useSaleDraft(), product: useProductDraftView(productId) }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <SaleDraftProvider>{children}</SaleDraftProvider>
    ),
  });
}

describe('useProductDraftView', () => {
  it('exposes the catalog entry and its units', () => {
    const { result } = render('prod_tequila');

    expect(result.current.product.product?.name).toBe('Sierra Tequila 350 ml');
    expect(result.current.product.units.map((unit) => unit.id)).toEqual([
      'unit_tequila_bottle',
      'unit_tequila_glass',
    ]);
    expect(result.current.product.isActive).toBe(false);
    expect(result.current.product.cartItem.lines).toEqual([]);
  });

  it('joins committed lines into a cart item with the committed total', () => {
    const { result } = render('prod_tequila');

    act(() => result.current.draft.setQuantityForProduct('prod_tequila', 'unit_tequila_bottle', 2));
    act(() => result.current.draft.setQuantityForProduct('prod_tequila', 'unit_tequila_bottle', 2));

    expect(result.current.product.cartItem.lines).toHaveLength(1);
    expect(result.current.product.cartItem.total).toBe(1700);
    expect(result.current.product.lines).toHaveLength(1);
  });

  it('tracks the active line only while the product is the one being worked on', () => {
    const { result } = render('prod_tequila');

    act(() => result.current.draft.openProduct('prod_tequila', 'unit_tequila_bottle'));

    expect(result.current.product.isActive).toBe(true);
    expect(result.current.product.activeLine?.productUnitId).toBe('unit_tequila_bottle');

    act(() => result.current.draft.closeProduct());

    expect(result.current.product.isActive).toBe(false);
    expect(result.current.product.activeLine).toBeUndefined();
  });
});
