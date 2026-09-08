import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useCreateBusinessForm } from '../useCreateBusinessForm';
import { businessService } from '@/features/business/api/businessService';
import { useBusinessContext } from '@/providers/business/useBusinessContext';

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: vi.fn() };
});

vi.mock('@/features/business/api/businessService', () => ({
  businessService: { listBusinesses: vi.fn(), createBusiness: vi.fn() },
}));

vi.mock('@/providers/business/useBusinessContext', () => ({
  useBusinessContext: vi.fn(),
}));

function fakeEvent() {
  return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

describe('useCreateBusinessForm', () => {
  const mockNavigate = vi.fn();
  const mockSetCurrentBusiness = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useBusinessContext).mockReturnValue({
      setCurrentBusiness: mockSetCurrentBusiness,
    } as unknown as ReturnType<typeof useBusinessContext>);
    vi.mocked(businessService.createBusiness).mockResolvedValue({
      business: { id: 'b-1' },
    } as never);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  );

  it('initializes with empty required fields, unset optional fields, and optional section hidden', () => {
    const { result } = renderHook(() => useCreateBusinessForm(), { wrapper });

    expect(result.current.values).toEqual({
      name: '',
      currencyCode: '',
    });
    expect(result.current.showOptional).toBe(false);
  });

  it('toggles the optional section', () => {
    const { result } = renderHook(() => useCreateBusinessForm(), { wrapper });

    act(() => result.current.setShowOptional(true));
    expect(result.current.showOptional).toBe(true);

    act(() => result.current.setShowOptional(false));
    expect(result.current.showOptional).toBe(false);
  });

  it('submits transformed values to createBusiness, sets the new business, and navigates to the dashboard', async () => {
    const { result } = renderHook(() => useCreateBusinessForm(), { wrapper });

    act(() => result.current.handleChange('name', 'Selam Mart'));
    act(() => result.current.handleChange('currencyCode', 'etb'));
    act(() => result.current.handleChange('defaultTaxRate', '15'));

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(businessService.createBusiness).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Selam Mart',
        currencyCode: 'ETB',
        defaultTaxRate: 15,
      }),
    );

    await waitFor(() => expect(mockSetCurrentBusiness).toHaveBeenCalledWith('b-1'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('submits without unset optional fields', async () => {
    const { result } = renderHook(() => useCreateBusinessForm(), { wrapper });

    act(() => result.current.handleChange('name', 'Selam Mart'));
    act(() => result.current.handleChange('currencyCode', 'ETB'));

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(businessService.createBusiness).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Selam Mart', currencyCode: 'ETB' }),
    );
  });

  it('does not call createBusiness when validation fails', async () => {
    const { result } = renderHook(() => useCreateBusinessForm(), { wrapper });

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(businessService.createBusiness).not.toHaveBeenCalled();
    expect(result.current.errors.name).toBeTruthy();
  });
});
