import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { SaleLineFormValues } from '@mez/types';
import { useSaleLineForm } from '../useSaleLineForm';
import { products, sellableUnitsByProductId } from '../../__tests__/fixtures';

function fakeEvent() {
  return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Missing ${what}`);
  return value;
}

const product = must(products[0], 'a product');
const units = sellableUnitsByProductId['prod_tequila'] ?? [];

function setup(initialLine?: SaleLineFormValues) {
  const onSave = vi.fn();
  const rendered = renderHook(() => useSaleLineForm({ product, units, initialLine, onSave }));
  return { onSave, ...rendered };
}

describe('useSaleLineForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts from blank fields for the picked product', () => {
    const { result } = setup();

    expect(result.current.form.getValues()).toEqual({
      productId: 'prod_tequila',
      productUnitId: '',
      quantity: '',
    });
  });

  it('starts from the line being edited', () => {
    const initial: SaleLineFormValues = {
      productId: 'prod_tequila',
      productUnitId: 'unit_tequila_bottle',
      quantity: '3',
    };

    const { result } = setup(initial);

    expect(result.current.form.getValues()).toMatchObject(initial);
  });

  it('blocks the save when no unit is chosen', async () => {
    const { result, onSave } = setup();

    act(() => result.current.setQuantity('2'));
    await act(async () => {
      await result.current.submit(fakeEvent());
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.errors.productUnitId?.message).toEqual(expect.any(String));
  });

  it('blocks the save when the quantity is blank', async () => {
    const { result, onSave } = setup();

    act(() => result.current.setProductUnitId('unit_tequila_bottle'));
    await act(async () => {
      await result.current.submit(fakeEvent());
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.errors.quantity?.message).toEqual(expect.any(String));
  });

  it('blocks the save when the quantity is not positive', async () => {
    const { result, onSave } = setup();

    act(() => result.current.setProductUnitId('unit_tequila_bottle'));
    act(() => result.current.setQuantity('0'));
    await act(async () => {
      await result.current.submit(fakeEvent());
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.errors.quantity?.message).toEqual(expect.any(String));
  });

  it('blocks a unit the product cannot be sold in', async () => {
    const { result, onSave } = setup();

    act(() => result.current.setProductUnitId('unit_tequila_case'));
    act(() => result.current.setQuantity('1'));
    await act(async () => {
      await result.current.submit(fakeEvent());
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.errors.productUnitId?.message).toEqual(expect.any(String));
  });

  it('saves the raw entered values when every field passes validation', async () => {
    const { result, onSave } = setup();

    act(() => result.current.setProductUnitId('unit_tequila_bottle'));
    act(() => result.current.setQuantity('2'));
    await act(async () => {
      await result.current.submit(fakeEvent());
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'prod_tequila',
        productUnitId: 'unit_tequila_bottle',
        quantity: '2',
        sellCapable: true,
      }),
    );
    const saved = onSave.mock.calls[0]?.[0];
    expect(typeof saved?.quantity).toBe('string');
  });

  it('shows the unit price once a unit is chosen and the total once a quantity is typed', () => {
    const { result } = setup();

    expect(result.current.unitPrice).toBeNull();

    act(() => result.current.setProductUnitId('unit_tequila_bottle'));
    expect(result.current.unitPrice).toBe(850);
    expect(result.current.total).toBeNull();

    act(() => result.current.setQuantity('2'));
    expect(result.current.total).toBe(1700);
  });
});
