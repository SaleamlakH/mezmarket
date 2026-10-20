import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { productsService } from '@/features/products/api/productsService';
import { usePlatformUnitsForm } from '../usePlatformUnitsForm';
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
  return renderHook(() => usePlatformUnitsForm({ businessId: 'b-1', product }), {
    wrapper: wrapper(createClient()),
  });
}

async function submit(hook: ReturnType<typeof usePlatformUnitsForm>) {
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

describe('usePlatformUnitsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes the base and content rows from the product', () => {
    const { result } = renderForm();

    expect(result.current.form.getValues()).toEqual({
      units: [
        { unitRole: 'BASE', id: 'pu-1', price: '250' },
        { unitRole: 'MOU', id: 'pu-3', price: '40' },
      ],
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('sends both rows as one role-tagged list', async () => {
    vi.mocked(productsService.updateProductUnits).mockResolvedValue(makeProduct() as never);
    const { result } = renderForm();

    act(() => {
      result.current.form.setValue('units.0.price', '300', { shouldDirty: true });
      result.current.form.setValue('units.1.price', '45', { shouldDirty: true });
    });
    await submit(result.current);

    expect(productsService.updateProductUnits).toHaveBeenCalledWith('b-1', 'p-1', {
      units: [
        { unitRole: 'BASE', id: 'pu-1', price: 300 },
        { unitRole: 'MOU', id: 'pu-3', price: 45 },
      ],
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('clears a blank content-unit price with null', async () => {
    vi.mocked(productsService.updateProductUnits).mockResolvedValue(makeProduct() as never);
    const { result } = renderForm();

    act(() => result.current.form.setValue('units.1.price', '', { shouldDirty: true }));
    await submit(result.current);

    expect(productsService.updateProductUnits).toHaveBeenCalledWith('b-1', 'p-1', {
      units: [
        { unitRole: 'BASE', id: 'pu-1', price: 250 },
        { unitRole: 'MOU', id: 'pu-3', price: null },
      ],
    });
  });

  it('reports a message for a blank base price and does not submit', async () => {
    const { result } = renderForm();

    act(() => result.current.form.setValue('units.0.price', '', { shouldDirty: true }));
    await submit(result.current);

    expectMessage(result.current.form.formState.errors.units?.[0]?.price?.message);
    expect(productsService.updateProductUnits).not.toHaveBeenCalled();
  });

  it('does not submit when the card has no edits', async () => {
    const { result } = renderForm();

    await submit(result.current);

    expect(productsService.updateProductUnits).not.toHaveBeenCalled();
  });
});
