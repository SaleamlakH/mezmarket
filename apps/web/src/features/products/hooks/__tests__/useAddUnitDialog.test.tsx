import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { DimensionResponse } from '@mez/types';
import { ApiError } from '@/lib/apiClient';
import { useAddContentUnitForm, useAddCustomUnitForm } from '../useAddUnitDialog';
import { makeProduct, TIMESTAMP } from './fixtures';

const dimensions: DimensionResponse[] = [
  {
    id: 'd-1',
    name: 'Count',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    units: [
      {
        id: 'su-pc',
        dimensionId: 'd-1',
        name: 'Piece',
        symbol: 'pc',
        ratioToReferenceUnit: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
  },
  {
    id: 'd-2',
    name: 'Volume',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    units: [
      {
        id: 'su-ml',
        dimensionId: 'd-2',
        name: 'Milliliter',
        symbol: 'ml',
        ratioToReferenceUnit: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
  },
];

function setupCustom() {
  const product = makeProduct();
  const baseUnit = product.units.find((unit) => unit.unitRole === 'BASE') ?? null;
  const contentUnit = product.units.find((unit) => unit.unitRole === 'MOU') ?? null;
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const hook = renderHook(() => useAddCustomUnitForm({ baseUnit, contentUnit, onSubmit, onClose }));

  return { ...hook, onSubmit, onClose };
}

function setupContent() {
  const product = makeProduct();
  const baseUnit = product.units.find((unit) => unit.unitRole === 'BASE') ?? null;
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const hook = renderHook(() => useAddContentUnitForm({ baseUnit, dimensions, onSubmit, onClose }));

  return { ...hook, onSubmit, onClose };
}

async function continueCustom(hook: ReturnType<typeof useAddCustomUnitForm>) {
  await act(async () => {
    await hook.continueToConfirm();
  });
}

async function continueContent(hook: ReturnType<typeof useAddContentUnitForm>) {
  await act(async () => {
    await hook.continueToConfirm();
  });
}

function fillCustomUnit(
  hook: ReturnType<typeof useAddCustomUnitForm>,
  values: Partial<{
    name: string;
    conversionRate: string;
    price: string;
    purchaseCapable: boolean;
    sellCapable: boolean;
  }>,
) {
  act(() => {
    for (const [field, value] of Object.entries(values)) {
      hook.form.setValue(field as 'name', value as never);
    }
  });
}

function fillContentUnit(
  hook: ReturnType<typeof useAddContentUnitForm>,
  values: Partial<{ unitId: string; conversionRate: string; price: string }>,
) {
  act(() => {
    for (const [field, value] of Object.entries(values)) {
      hook.form.setValue(field as 'unitId', value as never);
    }
  });
}

/**
 * Validation copy lives in `@mez/validation` and is expected to change, so the
 * tests only assert that a message is present, never what it says.
 */
function expectMessage(message: string | undefined) {
  expect(message).toEqual(expect.any(String));
  expect(message).not.toHaveLength(0);
}

describe('useAddCustomUnitForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts from the custom-unit defaults with the product unit names', () => {
    const { result } = setupCustom();

    expect(result.current.form.getValues()).toEqual({
      unitRole: 'CUSTOM',
      name: '',
      dependsOn: 'BASE',
      conversionRate: '',
      price: '',
      purchaseCapable: true,
      sellCapable: true,
    });
    expect(result.current.baseSymbol).toBe('Piece');
    expect(result.current.contentSymbol).toBe('ml');
    expect(result.current.basisLabel).toBe('Piece');
    expect(result.current.unitLabel).toBe('unit');
    expect(result.current.sellCapable).toBe(true);
    expect(result.current.pending).toBeNull();
  });

  it('follows the basis, name and sell switch as the owner edits', () => {
    const { result } = setupCustom();

    act(() => {
      result.current.form.setValue('name', 'Shot');
      result.current.form.setValue('dependsOn', 'MOU');
      result.current.form.setValue('sellCapable', false);
    });

    expect(result.current.unitLabel).toBe('Shot');
    expect(result.current.basisLabel).toBe('ml');
    expect(result.current.sellCapable).toBe(false);
  });

  it('reports the required fields on an empty submit', async () => {
    const { result } = setupCustom();

    await continueCustom(result.current);

    expectMessage(result.current.errors.name?.message);
    expectMessage(result.current.errors.conversionRate?.message);
    expect(result.current.pending).toBeNull();
  });

  it('holds the validated unit until it is confirmed', async () => {
    const { result, onSubmit } = setupCustom();
    fillCustomUnit(result.current, { name: 'Shot', conversionRate: '25', price: '30' });

    await continueCustom(result.current);

    expect(result.current.pending).toEqual({
      unitRole: 'CUSTOM',
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: 25,
      price: 30,
      purchaseCapable: true,
      sellCapable: true,
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('drops the price from a purchase-only unit', async () => {
    const { result } = setupCustom();
    fillCustomUnit(result.current, {
      name: 'Shot',
      conversionRate: '25',
      price: '30',
      sellCapable: false,
    });

    await continueCustom(result.current);

    expect(result.current.pending).toEqual({
      unitRole: 'CUSTOM',
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: 25,
      purchaseCapable: true,
      sellCapable: false,
    });
    expect(Object.hasOwn(result.current.pending ?? {}, 'price')).toBe(false);
  });

  it('creates the held unit and closes only after it succeeds', async () => {
    const { result, onSubmit, onClose } = setupCustom();
    fillCustomUnit(result.current, { name: 'Shot', conversionRate: '25', price: '30' });
    await continueCustom(result.current);

    await act(async () => {
      await result.current.confirm();
    });

    expect(onSubmit).toHaveBeenCalledWith(result.current.pending);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.isCreating).toBe(false);
  });

  it('maps a server detail onto the field and returns to the form', async () => {
    const { result, onSubmit, onClose } = setupCustom();
    vi.mocked(onSubmit).mockRejectedValue(
      new ApiError({
        code: 'BAD_REQUEST',
        message: 'Could not add the unit',
        status: 400,
        details: { name: 'That name is taken' },
      }),
    );
    fillCustomUnit(result.current, { name: 'Shot', conversionRate: '25', price: '30' });
    await continueCustom(result.current);

    await act(async () => {
      await result.current.confirm();
    });

    await waitFor(() => expect(result.current.errors.name?.message).toBe('That name is taken'));
    expect(result.current.errors.root?.message).toBe('Could not add the unit');
    expect(result.current.pending).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('returns to the form without creating when Back is pressed', async () => {
    const { result, onSubmit } = setupCustom();
    fillCustomUnit(result.current, { name: 'Shot', conversionRate: '25', price: '30' });
    await continueCustom(result.current);

    act(() => result.current.back());

    expect(result.current.pending).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does nothing when confirmed with no held unit', async () => {
    const { result, onSubmit, onClose } = setupCustom();

    await act(async () => {
      await result.current.confirm();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('useAddContentUnitForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers only the dimensions that differ from the base unit', () => {
    const { result } = setupContent();

    expect(result.current.baseSymbol).toBe('Piece');
    expect(result.current.groups).toEqual([
      {
        label: 'Volume',
        options: [{ value: 'su-ml', label: 'Milliliter' }],
      },
    ]);
    expect(result.current.chosenSymbol).toBe('content unit');
  });

  it('shows the symbol of the chosen unit', () => {
    const { result } = setupContent();

    fillContentUnit(result.current, { unitId: 'su-ml' });

    expect(result.current.chosenSymbol).toBe('ml');
  });

  it('reports the required fields on an empty submit', async () => {
    const { result } = setupContent();

    await continueContent(result.current);

    expectMessage(result.current.errors.unitId?.message);
    expectMessage(result.current.errors.conversionRate?.message);
    expect(result.current.pending).toBeNull();
  });

  it('holds the validated unit until it is confirmed', async () => {
    const { result, onSubmit } = setupContent();
    fillContentUnit(result.current, { unitId: 'su-ml', conversionRate: '750' });

    await continueContent(result.current);

    expect(result.current.pending).toEqual({
      unitRole: 'MOU',
      unitId: 'su-ml',
      conversionRate: 750,
    });
    expect(Object.hasOwn(result.current.pending ?? {}, 'price')).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('carries the optional selling price when one is entered', async () => {
    const { result } = setupContent();
    fillContentUnit(result.current, { unitId: 'su-ml', conversionRate: '750', price: '40' });

    await continueContent(result.current);

    expect(result.current.pending).toEqual({
      unitRole: 'MOU',
      unitId: 'su-ml',
      conversionRate: 750,
      price: 40,
    });
  });

  it('creates the held unit and closes only after it succeeds', async () => {
    const { result, onSubmit, onClose } = setupContent();
    fillContentUnit(result.current, { unitId: 'su-ml', conversionRate: '750' });
    await continueContent(result.current);

    await act(async () => {
      await result.current.confirm();
    });

    expect(onSubmit).toHaveBeenCalledWith(result.current.pending);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.isCreating).toBe(false);
  });

  it('maps a server detail onto the field and returns to the form', async () => {
    const { result, onSubmit, onClose } = setupContent();
    vi.mocked(onSubmit).mockRejectedValue(
      new ApiError({
        code: 'BAD_REQUEST',
        message: 'Could not add the unit',
        status: 400,
        details: { unitId: 'Choose a different unit' },
      }),
    );
    fillContentUnit(result.current, { unitId: 'su-ml', conversionRate: '750' });
    await continueContent(result.current);

    await act(async () => {
      await result.current.confirm();
    });

    await waitFor(() =>
      expect(result.current.errors.unitId?.message).toBe('Choose a different unit'),
    );
    expect(result.current.errors.root?.message).toBe('Could not add the unit');
    expect(result.current.pending).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('returns to the form without creating when Back is pressed', async () => {
    const { result, onSubmit } = setupContent();
    fillContentUnit(result.current, { unitId: 'su-ml', conversionRate: '750' });
    await continueContent(result.current);

    act(() => result.current.back());

    expect(result.current.pending).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
