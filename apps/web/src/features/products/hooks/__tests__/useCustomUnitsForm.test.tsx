import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { productsService } from '@/features/products/api/productsService';
import { useCustomUnitsForm } from '../useCustomUnitsForm';
import { makeProduct } from './fixtures';

vi.mock('@/features/products/api/productsService', () => ({
  productsService: {
    updateProductUnits: vi.fn(),
  },
}));

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function renderForm() {
  const product = makeProduct();
  return renderHook(() => useCustomUnitsForm({ businessId: 'b-1', product }), {
    wrapper: wrapper(createClient()),
  });
}

async function submit(hook: ReturnType<typeof useCustomUnitsForm>) {
  await act(async () => {
    await hook.submit();
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

describe('useCustomUnitsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('holds only the owner custom units', () => {
    const { result } = renderForm();

    expect(result.current.form.getValues()).toEqual({
      units: [
        {
          unitRole: 'CUSTOM',
          id: 'pu-2',
          name: 'Shot',
          price: '',
          purchaseCapable: true,
          sellCapable: false,
        },
      ],
    });
    expect(result.current.units.map((unit) => unit.id)).toEqual(['pu-2']);
    expect(result.current.isDirty).toBe(false);
  });

  it('sends the whole editable row as a role-tagged list', async () => {
    vi.mocked(productsService.updateProductUnits).mockResolvedValue(makeProduct() as never);
    const { result } = renderForm();

    act(() => result.current.form.setValue('units.0.name', 'Jigger', { shouldDirty: true }));
    await submit(result.current);

    expect(productsService.updateProductUnits).toHaveBeenCalledWith('b-1', 'p-1', {
      units: [
        {
          unitRole: 'CUSTOM',
          id: 'pu-2',
          name: 'Jigger',
          purchaseCapable: true,
          sellCapable: false,
        },
      ],
    });
  });

  it('sends the price when a unit is made sellable', async () => {
    vi.mocked(productsService.updateProductUnits).mockResolvedValue(makeProduct() as never);
    const { result } = renderForm();

    act(() => {
      result.current.form.setValue('units.0.sellCapable', true, { shouldDirty: true });
      result.current.form.setValue('units.0.price', '30', { shouldDirty: true });
    });
    await submit(result.current);

    expect(productsService.updateProductUnits).toHaveBeenCalledWith('b-1', 'p-1', {
      units: [
        {
          unitRole: 'CUSTOM',
          id: 'pu-2',
          name: 'Shot',
          purchaseCapable: true,
          sellCapable: true,
          price: 30,
        },
      ],
    });
  });

  it('reports a message when a sellable unit has no price', async () => {
    const { result } = renderForm();

    act(() => result.current.form.setValue('units.0.sellCapable', true, { shouldDirty: true }));
    await submit(result.current);

    expectMessage(result.current.form.formState.errors.units?.[0]?.price?.message);
    expect(productsService.updateProductUnits).not.toHaveBeenCalled();
  });

  it('reports a message when a unit is usable for neither purchasing nor selling', async () => {
    const { result } = renderForm();

    act(() => {
      result.current.form.setValue('units.0.purchaseCapable', false, { shouldDirty: true });
      result.current.form.setValue('units.0.name', 'Jigger', { shouldDirty: true });
    });
    await submit(result.current);

    expectMessage(result.current.form.formState.errors.units?.[0]?.sellCapable?.message);
    expect(productsService.updateProductUnits).not.toHaveBeenCalled();
  });
});
