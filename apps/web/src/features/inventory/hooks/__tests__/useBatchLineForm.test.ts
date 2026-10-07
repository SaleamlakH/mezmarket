import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { BatchLineFormValues } from '@mez/types';
import { useBatchLineForm } from '../useBatchLineForm';
import { products } from '../../__tests__/fixtures';

function fakeEvent() {
  return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Missing ${what}`);
  return value;
}

const product = must(products[0], 'a product');

function setup(initialLine?: BatchLineFormValues) {
  const onSave = vi.fn();
  const rendered = renderHook(() => useBatchLineForm({ product, initialLine, onSave }));
  return { onSave, ...rendered };
}

describe('useBatchLineForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts from blank fields for the picked product', () => {
    const { result } = setup();

    expect(result.current.form.getValues()).toEqual({
      productId: 'prod_tequila',
      productUnitId: '',
      purchaseQuantity: '',
      purchaseUnitCost: '',
    });
  });

  it('starts from the line being edited', () => {
    const initial: BatchLineFormValues = {
      productId: 'prod_oil',
      productUnitId: 'unit_oil_bottle',
      purchaseQuantity: '3',
      purchaseUnitCost: '5',
      expiryDate: '2026-10-01T00:00:00.000Z',
    };

    const { result } = setup(initial);

    expect(result.current.form.getValues()).toEqual(initial);
  });

  it('blocks the save and shows an error when a field fails validation', async () => {
    const { result, onSave } = setup();

    act(() => {
      result.current.form.setValue('productUnitId', 'unit_tequila_bottle');
      result.current.form.setValue('purchaseQuantity', '0');
      result.current.form.setValue('purchaseUnitCost', '10.5');
    });

    await act(async () => {
      await result.current.submit(fakeEvent());
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.errors.purchaseQuantity).toBeDefined();
  });

  it('saves the raw entered values when every field passes validation', async () => {
    const { result, onSave } = setup();

    act(() => {
      result.current.form.setValue('productUnitId', 'unit_tequila_bottle');
      result.current.form.setValue('purchaseQuantity', '2.5');
      result.current.form.setValue('purchaseUnitCost', '10.25');
    });

    await act(async () => {
      await result.current.submit(fakeEvent());
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      productId: 'prod_tequila',
      productUnitId: 'unit_tequila_bottle',
      purchaseQuantity: '2.5',
      purchaseUnitCost: '10.25',
    });
    const saved = onSave.mock.calls[0]?.[0];
    expect(typeof saved?.purchaseQuantity).toBe('string');
  });

  it('shows no line total until quantity and unit cost are both filled', () => {
    const { result } = setup();

    expect(result.current.total).toBeNull();

    act(() => result.current.form.setValue('purchaseQuantity', '2'));
    expect(result.current.total).toBeNull();

    act(() => result.current.form.setValue('purchaseUnitCost', '10.5'));
    expect(result.current.total).toBe(21);
  });
});
