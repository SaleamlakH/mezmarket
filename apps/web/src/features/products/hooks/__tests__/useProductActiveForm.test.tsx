import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { productsService } from '@/features/products/api/productsService';
import { useProductActiveForm } from '../useProductActiveForm';
import { makeProduct } from './fixtures';

vi.mock('@/features/products/api/productsService', () => ({
  productsService: {
    setProductActive: vi.fn(),
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

function renderForm(onSaved = vi.fn()) {
  const product = makeProduct();
  return renderHook(() => useProductActiveForm({ businessId: 'b-1', product, onSaved }), {
    wrapper: wrapper(createClient()),
  });
}

describe('useProductActiveForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts from the product active state without a confirmation', () => {
    const { result } = renderForm();

    expect(result.current.active).toBe(true);
    expect(result.current.confirmOpen).toBe(false);
  });

  it('asks for confirmation before writing the toggle', () => {
    const { result } = renderForm();

    act(() => result.current.requestToggle());

    expect(result.current.confirmOpen).toBe(true);
    expect(productsService.setProductActive).not.toHaveBeenCalled();
  });

  it('drops a pending toggle when the confirmation is cancelled', () => {
    const { result } = renderForm();

    act(() => result.current.requestToggle());
    act(() => result.current.cancelToggle());

    expect(result.current.confirmOpen).toBe(false);
    expect(result.current.active).toBe(true);
    expect(productsService.setProductActive).not.toHaveBeenCalled();
  });

  it('writes the confirmed value through the active endpoint', async () => {
    const saved = { ...makeProduct(), active: false };
    vi.mocked(productsService.setProductActive).mockResolvedValue(saved as never);
    const onSaved = vi.fn();
    const { result } = renderForm(onSaved);

    act(() => result.current.requestToggle());
    await act(async () => {
      await result.current.confirm();
    });

    expect(productsService.setProductActive).toHaveBeenCalledWith('b-1', 'p-1', { active: false });
    expect(result.current.confirmOpen).toBe(false);
    expect(onSaved).toHaveBeenCalledWith('Product deactivated.');
  });

  it('keeps the sheet open and reports an error when the update fails', async () => {
    vi.mocked(productsService.setProductActive).mockRejectedValue(new Error('Failed to save'));
    const onSaved = vi.fn();
    const { result } = renderForm(onSaved);

    act(() => result.current.requestToggle());
    await act(async () => {
      await result.current.confirm();
    });

    await waitFor(() => expect(result.current.error).toBe('Failed to save'));
    expect(result.current.confirmOpen).toBe(true);
    expect(onSaved).not.toHaveBeenCalled();
  });
});
