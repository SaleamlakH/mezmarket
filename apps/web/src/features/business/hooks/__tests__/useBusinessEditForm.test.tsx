import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BusinessResponse } from '@mez/types';
import { useBusinessEditForm, toEditFormValues } from '../useBusinessEditForm';
import { businessService } from '@/features/business/api/businessService';

vi.mock('@/features/business/api/businessService', () => ({
  businessService: {
    updateBusiness: vi.fn(),
  },
}));

function business(): BusinessResponse {
  return {
    id: 'b-1',
    ownerId: 'o-1',
    name: 'Selam Mart',
    currencyCode: 'ETB',
    defaultTaxRate: 15,
    taxOnSales: false,
    allowNegativeStock: true,
    lowStockDefaultThreshold: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function renderEditFormHook(
  business: BusinessResponse,
  onSaved?: (updated: BusinessResponse) => void,
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(() => useBusinessEditForm(business, onSaved ? { onSaved } : undefined), {
    wrapper,
  });
}

describe('useBusinessEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes values from the business and reports no changes', () => {
    const b = business();
    const { result } = renderEditFormHook(b);

    expect(result.current.values).toEqual(toEditFormValues(b));
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.status).toBe('idle');
  });

  it('reports dirty once a field value differs from the saved business', () => {
    const { result } = renderEditFormHook(business());

    act(() => result.current.handleChange('name', 'Selam Mart 2'));

    expect(result.current.values.name).toBe('Selam Mart 2');
    expect(result.current.isDirty).toBe(true);
  });

  it('does not report dirty when a numeric field is edited back and forth', () => {
    const { result } = renderEditFormHook(business());

    act(() => result.current.handleChange('defaultTaxRate', '25'));
    act(() => result.current.handleChange('defaultTaxRate', '15'));

    expect(result.current.isDirty).toBe(false);
  });

  it('submits the change, resets dirty, and calls onSaved with the updated business', async () => {
    const updated = { ...business(), name: 'Selam Mart 2' };
    vi.mocked(businessService.updateBusiness).mockResolvedValue(updated as never);
    const onSaved = vi.fn();

    const { result } = renderEditFormHook(business(), onSaved);
    act(() => result.current.handleChange('name', 'Selam Mart 2'));

    const event = { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(businessService.updateBusiness).toHaveBeenCalledWith(
      'b-1',
      expect.objectContaining({ name: 'Selam Mart 2' }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.status).toBe('success');
  });

  it('keeps dirty true and exposes an error when the update fails', async () => {
    vi.mocked(businessService.updateBusiness).mockRejectedValue(new Error('Failed to save'));
    const { result } = renderEditFormHook(business());

    act(() => result.current.handleChange('name', 'Selam Mart 2'));

    const event = { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(event);
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.formError).toMatch(/failed to save/i);
    expect(result.current.isDirty).toBe(true);
  });

  it('populates field errors when validation fails and does not submit', async () => {
    const { result } = renderEditFormHook(business());

    act(() => result.current.handleChange('currencyCode', 'X'));

    const event = { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(businessService.updateBusiness).not.toHaveBeenCalled();
    expect(result.current.errors.currencyCode).toBe('Enter a valid 3-letter ISO currency code');
  });

  it('converts empty numeric fields back to null on the saved value', async () => {
    vi.mocked(businessService.updateBusiness).mockResolvedValue({
      ...business(),
      defaultTaxRate: null,
      lowStockDefaultThreshold: null,
    } as never);
    const onSaved = vi.fn();

    const { result } = renderEditFormHook(business(), onSaved);
    act(() => result.current.handleChange('defaultTaxRate', ''));
    act(() => result.current.handleChange('lowStockDefaultThreshold', ''));

    const event = { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(event);
    });

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(result.current.isDirty).toBe(false);
  });
});
