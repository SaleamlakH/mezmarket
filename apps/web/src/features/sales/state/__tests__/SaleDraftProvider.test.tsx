import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { SaleDraftContextValue, SaleDraftLine } from '../saleDraft';
import { SaleDraftProvider } from '../SaleDraftProvider';
import { useSaleDraft } from '../useSaleDraft';

type Draft = { current: SaleDraftContextValue };

function renderDraft() {
  return renderHook(() => useSaleDraft(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <SaleDraftProvider>{children}</SaleDraftProvider>
    ),
  });
}

function activeId(draft: Draft): string {
  const id = draft.current.activeLineId;
  if (!id) throw new Error('expected an active line');
  return id;
}

function firstLine(draft: Draft): SaleDraftLine {
  const line = draft.current.lines[0];
  if (!line) throw new Error('expected a line');
  return line;
}

describe('SaleDraftProvider', () => {
  it('opens a product with a first line on its default unit', () => {
    const { result } = renderDraft();

    act(() => result.current.openProduct('p1', 'u1'));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.activeProductId).toBe('p1');
    const line = firstLine(result);
    expect(line.productId).toBe('p1');
    expect(line.productUnitId).toBe('u1');
    expect(line.quantity).toBe(0);
    expect(result.current.activeLineId).toBe(line.id);
  });

  it('reuses the last line when a product is opened again', () => {
    const { result } = renderDraft();

    act(() => result.current.openProduct('p1', 'u1'));
    const firstId = activeId(result);
    act(() => result.current.setQuantity(firstId, 2));
    act(() => result.current.closeProduct());
    act(() => result.current.openProduct('p1', 'u1'));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.activeLineId).toBe(firstId);
    expect(firstLine(result).quantity).toBe(2);
  });

  it('closes the active product without dropping its lines', () => {
    const { result } = renderDraft();

    act(() => result.current.openProduct('p1', 'u1'));
    act(() => result.current.closeProduct());

    expect(result.current.activeProductId).toBeNull();
    expect(result.current.activeLineId).toBeNull();
    expect(result.current.lines).toHaveLength(1);
  });

  it('ignores an empty unit from the selector placeholder', () => {
    const { result } = renderDraft();

    act(() => result.current.openProduct('p1', 'u1'));
    act(() => result.current.setQuantity(activeId(result), 3));
    const before = result.current.lines;

    act(() => result.current.setUnit(''));

    expect(result.current.lines).toEqual(before);
    expect(result.current.lines).toHaveLength(1);
  });

  it('does not create a line when the quick controller clears the unit', () => {
    const { result } = renderDraft();

    act(() => result.current.setUnitForProduct('p1', ''));

    expect(result.current.lines).toHaveLength(0);
    expect(result.current.activeLineId).toBeNull();
  });

  it('swaps the active line unit while it holds no quantity', () => {
    const { result } = renderDraft();

    act(() => result.current.openProduct('p1', 'u1'));
    act(() => result.current.setUnit('u2'));

    expect(result.current.lines).toHaveLength(1);
    expect(firstLine(result).productUnitId).toBe('u2');
  });

  it('starts a sister line when a new unit is picked after a quantity was set', () => {
    const { result } = renderDraft();

    act(() => result.current.openProduct('p1', 'u1'));
    const firstId = activeId(result);
    act(() => result.current.setQuantity(firstId, 2));
    act(() => result.current.setUnit('u2'));

    expect(result.current.lines).toHaveLength(2);
    const active = result.current.lines.find((line) => line.id === result.current.activeLineId);
    expect(active?.id).not.toBe(firstId);
    expect(active?.productUnitId).toBe('u2');
    expect(active?.quantity).toBe(0);
  });

  it('re-activates an existing line when its unit is picked again', () => {
    const { result } = renderDraft();

    act(() => result.current.openProduct('p1', 'u1'));
    const firstId = activeId(result);
    act(() => result.current.setQuantity(firstId, 2));
    act(() => result.current.setUnit('u2'));
    act(() => result.current.setUnit('u1'));

    expect(result.current.lines).toHaveLength(2);
    expect(result.current.activeLineId).toBe(firstId);
  });

  it('clamps a quantity to zero and writes it onto the line', () => {
    const { result } = renderDraft();

    act(() => result.current.openProduct('p1', 'u1'));
    const id = activeId(result);

    act(() => result.current.setQuantity(id, -5));
    expect(firstLine(result).quantity).toBe(0);

    act(() => result.current.setQuantity(id, 4));
    expect(firstLine(result).quantity).toBe(4);
  });

  it('creates a line with the default unit when setting a quantity for an unseen product', () => {
    const { result } = renderDraft();

    act(() => result.current.setQuantityForProduct('p1', 'u1', 3));

    expect(result.current.lines).toHaveLength(1);
    expect(firstLine(result).productUnitId).toBe('u1');
    expect(firstLine(result).quantity).toBe(3);
    expect(result.current.activeProductId).toBe('p1');
  });

  it('opens the product and picks the unit on the quick controller first use', () => {
    const { result } = renderDraft();

    act(() => result.current.setUnitForProduct('p1', 'u2'));

    expect(result.current.lines).toHaveLength(1);
    expect(firstLine(result).productUnitId).toBe('u2');
    expect(firstLine(result).quantity).toBe(0);
    expect(result.current.activeProductId).toBe('p1');
  });

  it('removes the active line and falls back to the product’s last line', () => {
    const { result } = renderDraft();

    act(() => result.current.openProduct('p1', 'u1'));
    const firstId = activeId(result);
    act(() => result.current.setQuantity(firstId, 1));
    act(() => result.current.setUnit('u2'));
    const secondId = activeId(result);

    act(() => result.current.removeActiveLine());
    expect(result.current.lines.find((line) => line.id === secondId)).toBeUndefined();
    expect(result.current.activeLineId).toBe(firstId);

    act(() => result.current.removeActiveLine());
    expect(result.current.lines).toHaveLength(0);
    expect(result.current.activeProductId).toBeNull();
    expect(result.current.activeLineId).toBeNull();
  });

  it('scopes lines to their product', () => {
    const { result } = renderDraft();

    act(() => result.current.openProduct('p1', 'u1'));
    act(() => result.current.openProduct('p2', 'u2'));

    expect(result.current.linesForProduct('p1')).toHaveLength(1);
    expect(result.current.linesForProduct('p1')[0]?.productId).toBe('p1');
    expect(result.current.linesForProduct('p2')[0]?.productUnitId).toBe('u2');
    expect(result.current.linesForProduct('missing')).toHaveLength(0);
  });

  it('throws when used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useSaleDraft())).toThrow(/within a SaleDraftProvider/);

    spy.mockRestore();
  });
});
