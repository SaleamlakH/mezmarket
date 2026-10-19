import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/apiClient';
import { productsService } from '@/features/products/api/productsService';
import { useProductFieldsForm } from '../useProductFieldsForm';
import { makeProduct } from './fixtures';

vi.mock('@/features/products/api/productsService', () => ({
  productsService: {
    updateProduct: vi.fn(),
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
  return renderHook(() => useProductFieldsForm({ businessId: 'b-1', product }), {
    wrapper: wrapper(createClient()),
  });
}

async function submit(hook: ReturnType<typeof useProductFieldsForm>) {
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

describe('useProductFieldsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes the fields card from the product and reports no changes', () => {
    const { result } = renderForm();

    expect(result.current.form.getValues()).toEqual({
      name: 'Honey',
      brand: 'Rosita',
      description: '',
      lowStockThreshold: '5',
      trackAsPartial: false,
      categoryId: '',
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.form.formState.errors).toEqual({});
  });

  it('reports dirty once a field differs from the saved product', () => {
    const { result } = renderForm();

    act(() => result.current.form.setValue('name', 'Honey 750 ml', { shouldDirty: true }));

    expect(result.current.isDirty).toBe(true);
  });

  it('submits the whole record, including fields this card does not show', async () => {
    const saved = { ...makeProduct(), name: 'Honey 750 ml' };
    vi.mocked(productsService.updateProduct).mockResolvedValue(saved as never);
    const { result } = renderForm();

    act(() => result.current.form.setValue('name', 'Honey 750 ml', { shouldDirty: true }));
    await submit(result.current);

    expect(productsService.updateProduct).toHaveBeenCalledWith('b-1', 'p-1', {
      name: 'Honey 750 ml',
      brand: 'Rosita',
      description: null,
      lowStockThreshold: 5,
      trackAsPartial: false,
      categoryId: null,
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('reports the validation message for a blank name without calling the API', async () => {
    const { result } = renderForm();

    act(() => result.current.form.setValue('name', '   ', { shouldDirty: true }));
    await submit(result.current);

    expectMessage(result.current.form.formState.errors.name?.message);
    expect(productsService.updateProduct).not.toHaveBeenCalled();
  });

  it('does not call the API when the card has no edits', async () => {
    const { result } = renderForm();

    await submit(result.current);

    expect(productsService.updateProduct).not.toHaveBeenCalled();
  });

  it('maps a server detail onto the named field', async () => {
    vi.mocked(productsService.updateProduct).mockRejectedValue(
      new ApiError({
        code: 'BAD_REQUEST',
        message: 'That name is taken',
        status: 400,
        details: { name: 'That name is taken' },
      }),
    );
    const { result } = renderForm();

    act(() => result.current.form.setValue('name', 'Honey 750 ml', { shouldDirty: true }));
    await submit(result.current);

    await waitFor(() =>
      expect(result.current.form.formState.errors.name?.message).toBe('That name is taken'),
    );
    expect(result.current.error).toBe('That name is taken');
  });
});
