import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { SaleLineFormValues } from '@mez/types';
import { useNewSale } from '../useNewSale';

const setup = () => renderHook(() => useNewSale());

const today = () => new Date().toISOString().slice(0, 10);

function line(overrides: Partial<SaleLineFormValues> = {}): SaleLineFormValues {
  return {
    productId: 'prod_tequila',
    productUnitId: 'unit_tequila_bottle',
    quantity: '2',
    ...overrides,
  };
}

describe('useNewSale', () => {
  it('starts with an empty draft dated today', () => {
    const { result } = setup();

    expect(result.current.lines).toEqual([]);
    expect(result.current.linesError).toBeUndefined();
    expect(result.current.form.getValues('saleDatetime')?.slice(0, 10)).toBe(today());
  });

  it('adds a sale line', () => {
    const { result } = setup();

    act(() => result.current.addLine(line()));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0]).toMatchObject(line());
  });

  it('replaces the sale line being edited', () => {
    const { result } = setup();

    act(() => result.current.addLine(line()));
    act(() => result.current.updateLine(0, line({ quantity: '4' })));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0]?.quantity).toBe('4');
  });

  it('removes a sale line', () => {
    const { result } = setup();

    act(() => result.current.addLine(line()));
    act(() => result.current.addLine(line({ productId: 'prod_oil' })));
    act(() => result.current.removeLine(0));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0]?.productId).toBe('prod_oil');
  });

  it('resets back to an empty draft dated today', () => {
    const { result } = setup();

    act(() => result.current.addLine(line()));
    act(() => result.current.form.setValue('saleDatetime', '2026-01-01T00:00:00.000Z'));
    act(() => result.current.reset());

    expect(result.current.lines).toEqual([]);
    expect(result.current.form.getValues('saleDatetime')?.slice(0, 10)).toBe(today());
  });

  it('reports a form-level error when the sale has no lines', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.form.trigger();
    });

    expect(result.current.linesError).toEqual(expect.any(String));
  });

  it('clears the form-level error once a line is added', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.form.trigger();
    });
    expect(result.current.linesError).toEqual(expect.any(String));

    act(() => result.current.addLine(line()));
    await act(async () => {
      await result.current.form.trigger();
    });

    expect(result.current.linesError).toBeUndefined();
  });
});
