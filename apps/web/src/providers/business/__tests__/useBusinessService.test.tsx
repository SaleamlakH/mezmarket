import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { BusinessResponse } from '@mez/types';
import type { BusinessService } from '../types';
import { useBusinessService } from '../useBusinessService';

const STORAGE_KEY = 'mezmarket:business:u1';

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

function makeService(overrides?: Partial<BusinessService>): BusinessService {
  return {
    listBusinesses: vi.fn(),
    createBusiness: vi.fn(),
    getBusiness: vi.fn(),
    updateBusiness: vi.fn(),
    ...overrides,
  };
}

// Created fresh in beforeEach, referenced (not recreated) by the wrapper on every render.
let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useBusinessService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          // Prevents stale cache from a previous test's client bleeding into assertions
          gcTime: 0,
        },
      },
    });
  });

  it('starts in loading state and transitions to ready when data arrives', async () => {
    const service = makeService({
      listBusinesses: vi.fn().mockResolvedValue([business('b1', 'A')]),
    });

    const { result } = renderHook(() => useBusinessService('u1', service), { wrapper });

    expect(result.current.status).toBe('loading');
    expect(result.current.businesses).toEqual([]);

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.businesses).toHaveLength(1);
  });

  it('disables the query when userId is null', async () => {
    const service = makeService({ listBusinesses: vi.fn() });

    renderHook(() => useBusinessService(null, service), { wrapper });

    expect(service.listBusinesses).not.toHaveBeenCalled();
  });

  it('auto-selects the single business when there is no stored selection', async () => {
    const service = makeService({
      listBusinesses: vi.fn().mockResolvedValue([business('b1', 'A')]),
    });

    const { result } = renderHook(() => useBusinessService('u1', service), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.currentBusiness?.id).toBe('b1');
  });

  it('selects the first business from the list when nothing is stored', async () => {
    const service = makeService({
      listBusinesses: vi.fn().mockResolvedValue([business('b1', 'A'), business('b2', 'B')]),
    });

    const { result } = renderHook(() => useBusinessService('u1', service), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.currentBusiness?.id).toBe('b1');
  });

  it('prefers the last-used business when it still exists', async () => {
    localStorage.setItem(STORAGE_KEY, 'b2');
    const service = makeService({
      listBusinesses: vi.fn().mockResolvedValue([business('b1', 'A'), business('b2', 'B')]),
    });

    const { result } = renderHook(() => useBusinessService('u1', service), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.currentBusiness?.id).toBe('b2');
  });

  it('re-selects the first business when the stored id is stale', async () => {
    localStorage.setItem(STORAGE_KEY, 'deleted');
    const service = makeService({
      listBusinesses: vi.fn().mockResolvedValue([business('b1', 'A'), business('b2', 'B')]),
    });

    const { result } = renderHook(() => useBusinessService('u1', service), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.currentBusiness?.id).toBe('b1');
  });

  it('setCurrentBusiness selects and persists the given business', async () => {
    const service = makeService({
      listBusinesses: vi.fn().mockResolvedValue([business('b1', 'A'), business('b2', 'B')]),
    });

    const { result } = renderHook(() => useBusinessService('u1', service), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.setCurrentBusiness('b2'));

    expect(result.current.currentBusiness?.id).toBe('b2');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('b2');
  });

  it('returns empty businesses list and null currentBusiness when there are no businesses', async () => {
    const service = makeService({ listBusinesses: vi.fn().mockResolvedValue([]) });

    const { result } = renderHook(() => useBusinessService('u1', service), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.businesses).toEqual([]);
    expect(result.current.currentBusiness).toBeNull();
  });

  it('exposes error status when the query fails', async () => {
    const service = makeService({
      listBusinesses: vi.fn().mockRejectedValue(new Error('network failure')),
    });

    const { result } = renderHook(() => useBusinessService('u1', service), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.businesses).toEqual([]);
    expect(result.current.currentBusiness).toBeNull();
  });

  it('refetch triggers a fresh fetch', async () => {
    const listBusinesses = vi.fn().mockResolvedValue([business('b1', 'A')]);
    const service = makeService({ listBusinesses });

    const { result } = renderHook(() => useBusinessService('u1', service), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(listBusinesses).toHaveBeenCalledTimes(1);

    listBusinesses.mockResolvedValue([business('b1', 'A'), business('b3', 'C')]);
    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.businesses).toHaveLength(2));
  });
});
