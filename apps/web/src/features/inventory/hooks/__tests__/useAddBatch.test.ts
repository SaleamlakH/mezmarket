import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { BatchLineFormValues } from '@mez/types';
import { useAddBatch } from '../useAddBatch';

function fakeEvent() {
  return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

function setup() {
  const onClose = vi.fn();
  const rendered = renderHook(() => useAddBatch({ onClose }));
  return { onClose, ...rendered };
}

function line(overrides: Partial<BatchLineFormValues> = {}): BatchLineFormValues {
  return {
    productId: 'prod_tequila',
    productUnitId: 'unit_tequila_bottle',
    purchaseQuantity: '2',
    purchaseUnitCost: '10.5',
    ...overrides,
  };
}

const today = () => new Date().toISOString().slice(0, 10);

describe('useAddBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with an empty batch dated today', () => {
    const { result } = setup();

    expect(result.current.lines).toEqual([]);
    expect(result.current.linesError).toBeUndefined();
    expect(result.current.form.getValues('supplierName')).toBe('');
    expect(result.current.form.getValues('batchDate').slice(0, 10)).toBe(today());
  });

  it('adds a product line to the batch', () => {
    const { result } = setup();

    act(() => result.current.addLine(line()));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0]).toMatchObject(line());
  });

  it('replaces the product line being edited', () => {
    const { result } = setup();

    act(() => result.current.addLine(line()));
    act(() => result.current.updateLine(0, line({ purchaseQuantity: '4' })));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0]?.purchaseQuantity).toBe('4');
  });

  it('removes a product line from the batch', () => {
    const { result } = setup();

    act(() => result.current.addLine(line()));
    act(() => result.current.addLine(line({ productId: 'prod_oil' })));
    act(() => result.current.removeLine(0));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0]?.productId).toBe('prod_oil');
  });

  it('totals only the lines whose quantity and cost are both filled', () => {
    const { result } = setup();

    act(() => result.current.addLine(line()));
    expect(result.current.totalAmount).toBe(21);

    act(() => result.current.addLine(line({ purchaseUnitCost: '' })));
    expect(result.current.lines).toHaveLength(2);
    expect(result.current.totalAmount).toBe(21);
  });

  it('does not confirm while the batch has no product lines', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.confirm(fakeEvent());
    });

    expect(result.current.isConfirmed).toBe(false);
    expect(result.current.linesError).toBeTruthy();
  });

  it('does not confirm and shows an error when the batch date fails validation', async () => {
    const { result } = setup();

    act(() => result.current.addLine(line()));
    act(() => result.current.form.setValue('batchDate', ''));
    await act(async () => {
      await result.current.confirm(fakeEvent());
    });

    expect(result.current.isConfirmed).toBe(false);
    expect(result.current.errors.batchDate).toBeDefined();
  });

  it('confirms a batch that has a product line and a valid date', async () => {
    const { result } = setup();

    act(() => result.current.addLine(line()));
    await act(async () => {
      await result.current.confirm(fakeEvent());
    });

    expect(result.current.isConfirmed).toBe(true);
    expect(result.current.linesError).toBeUndefined();
  });

  it('resets the draft and calls onClose when closed', async () => {
    const { result, onClose } = setup();

    act(() => result.current.addLine(line()));
    act(() => result.current.form.setValue('supplierName', 'Acme Traders'));
    await act(async () => {
      await result.current.confirm(fakeEvent());
    });
    expect(result.current.isConfirmed).toBe(true);

    act(() => result.current.close());

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.isConfirmed).toBe(false);
    expect(result.current.lines).toEqual([]);
    expect(result.current.form.getValues('supplierName')).toBe('');
    expect(result.current.form.getValues('batchDate').slice(0, 10)).toBe(today());
  });
});
