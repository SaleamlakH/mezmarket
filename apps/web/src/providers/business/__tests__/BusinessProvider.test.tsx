import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BusinessResponse } from '@mez/types';
import { BusinessProvider } from '../BusinessProvider';
import { useBusinessContext } from '../useBusinessContext';

const storageKey = 'mezmarket:business:u1';

function business(id: string, name: string): BusinessResponse {
  return {
    id,
    ownerId: 'o1',
    name,
    currencyCode: 'ETB',
    defaultTaxRate: null,
    taxDisplayMode: 'EXCLUSIVE',
    allowNegativeStock: true,
    lowStockDefaultThreshold: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('BusinessProvider', () => {
  const mockBusinessService = {
    listBusinesses: vi.fn(),
    createBusiness: vi.fn(),
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <BusinessProvider userId="u1" businessService={mockBusinessService}>
        {children}
      </BusinessProvider>
    </QueryClientProvider>
  );

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('auto-selects the single business when there is no stored selection', async () => {
    mockBusinessService.listBusinesses.mockResolvedValue([business('b1', 'Selam')]);

    const { result } = renderHook(() => useBusinessContext(), { wrapper });

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.currentBusiness?.id).toBe('b1');
  });

  it('prefers the last-used business when it still exists', async () => {
    localStorage.setItem(storageKey, 'b2');
    mockBusinessService.listBusinesses.mockResolvedValue([
      business('b1', 'Selam'),
      business('b2', 'Blue'),
    ]);

    const { result } = renderHook(() => useBusinessContext(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.currentBusiness?.id).toBe('b2');
  });

  it('selects the first business when nothing is stored', async () => {
    mockBusinessService.listBusinesses.mockResolvedValue([
      business('b1', 'Selam'),
      business('b2', 'Blue'),
    ]);

    const { result } = renderHook(() => useBusinessContext(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.currentBusiness?.id).toBe('b1');
  });

  it('setCurrentBusiness selects and persists the given business', async () => {
    mockBusinessService.listBusinesses.mockResolvedValue([
      business('b1', 'Selam'),
      business('b2', 'Blue'),
    ]);

    const { result } = renderHook(() => useBusinessContext(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.setCurrentBusiness('b2'));

    expect(result.current.currentBusiness?.id).toBe('b2');
    expect(localStorage.getItem(storageKey)).toBe('b2');
  });

  it('re-selects the first business when the stored id is stale', async () => {
    localStorage.setItem(storageKey, 'deleted');
    mockBusinessService.listBusinesses.mockResolvedValue([
      business('b1', 'Selam'),
      business('b2', 'Blue'),
    ]);

    const { result } = renderHook(() => useBusinessContext(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.currentBusiness?.id).toBe('b1');
  });

  it('exposes an empty list on ready when the owner has no businesses', async () => {
    mockBusinessService.listBusinesses.mockResolvedValue([]);

    const { result } = renderHook(() => useBusinessContext(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.businesses).toEqual([]);
    expect(result.current.currentBusiness).toBeNull();
  });
});

describe('useBusinessContext', () => {
  it('throws a clear error when used outside of BusinessProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useBusinessContext());
    }).toThrow(/useBusinessContext must be used within a BusinessProvider/i);

    spy.mockRestore();
  });
});
