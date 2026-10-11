import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { BusinessResponse, CreateBatchInput, StockBatchDetailResponse } from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import { inventoryService } from '../../api/inventoryService';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { catalogKeys } from '@/hooks/useCatalogApi';
import {
  inventoryKeys,
  useCreateBatch,
  useInventoryBatches,
  useInventoryProducts,
} from '../useInventoryApi';
import { batches, products } from '../../__tests__/fixtures';

vi.mock('../../api/inventoryService', () => ({
  inventoryService: {
    getBatches: vi.fn(),
    getInventoryProducts: vi.fn(),
    createBatch: vi.fn(),
  },
}));

vi.mock('@/providers/business/useBusinessContext', () => ({
  useBusinessContext: vi.fn(),
}));

function businessFixture(id: string): BusinessResponse {
  return {
    id,
    ownerId: 'owner_1',
    name: 'Test Business',
    currencyCode: 'ETB',
    defaultTaxRate: null,
    taxDisplayMode: 'EXCLUSIVE',
    allowNegativeStock: true,
    lowStockDefaultThreshold: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function setBusiness(id: string | null) {
  vi.mocked(useBusinessContext).mockReturnValue({
    status: 'ready',
    businesses: [],
    currentBusiness: id === null ? null : businessFixture(id),
    setCurrentBusiness: vi.fn(),
    refetch: vi.fn(),
  } satisfies BusinessContextValue);
}

// Created fresh in beforeEach, referenced (not recreated) by the wrapper on every render.
let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const createInput: CreateBatchInput = {
  batchDate: new Date('2026-10-01T00:00:00.000Z'),
  supplierName: 'Mango Wholesale',
  lines: [
    {
      productId: 'prod_tequila',
      productUnitId: 'unit_tequila_bottle',
      purchaseQuantity: 2,
      purchaseUnitCost: 10.5,
    },
  ],
};

describe('useInventoryApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    setBusiness('b1');
  });

  describe('useInventoryBatches', () => {
    it('fetches the batches of the current business', async () => {
      vi.mocked(inventoryService.getBatches).mockResolvedValue(batches);

      const { result } = renderHook(() => useInventoryBatches(), { wrapper });

      expect(result.current.isPending).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(inventoryService.getBatches).toHaveBeenCalledWith('b1');
      expect(result.current.data).toEqual(batches);
      expect(queryClient.getQueryData(inventoryKeys.batches('b1'))).toEqual(batches);
    });

    it('stays idle without a selected business', () => {
      setBusiness(null);

      const { result } = renderHook(() => useInventoryBatches(), { wrapper });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(inventoryService.getBatches).not.toHaveBeenCalled();
    });
  });

  describe('useInventoryProducts', () => {
    it('fetches the inventory products of the current business', async () => {
      vi.mocked(inventoryService.getInventoryProducts).mockResolvedValue(products);

      const { result } = renderHook(() => useInventoryProducts(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(inventoryService.getInventoryProducts).toHaveBeenCalledWith('b1');
      expect(result.current.data).toEqual(products);
      expect(queryClient.getQueryData(inventoryKeys.inventoryProducts('b1'))).toEqual(products);
    });

    it('stays idle without a selected business', () => {
      setBusiness(null);

      renderHook(() => useInventoryProducts(), { wrapper });

      expect(inventoryService.getInventoryProducts).not.toHaveBeenCalled();
    });
  });

  describe('useCreateBatch', () => {
    it('creates the batch for the current business and refreshes the lists', async () => {
      const created = batches[0] as StockBatchDetailResponse;
      vi.mocked(inventoryService.createBatch).mockResolvedValue(created);
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateBatch(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(createInput);
      });

      expect(inventoryService.createBatch).toHaveBeenCalledWith('b1', createInput);
      await waitFor(() => expect(result.current.data).toEqual(created));
      expect(invalidate).toHaveBeenCalledWith({ queryKey: inventoryKeys.batches('b1') });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: inventoryKeys.inventoryProducts('b1') });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: catalogKeys.products('b1') });
    });

    it('rejects without calling the service when no business is selected', async () => {
      setBusiness(null);

      const { result } = renderHook(() => useCreateBatch(), { wrapper });

      let error: unknown;
      await act(async () => {
        await result.current.mutateAsync(createInput).catch((caught) => {
          error = caught;
        });
      });

      expect(error).toEqual(expect.any(Error));
      expect((error as Error).message).toBe('No business selected');
      expect(inventoryService.createBatch).not.toHaveBeenCalled();
    });

    it('propagates the service failure to the caller', async () => {
      vi.mocked(inventoryService.createBatch).mockRejectedValue(new Error('network down'));

      const { result } = renderHook(() => useCreateBatch(), { wrapper });

      let error: unknown;
      await act(async () => {
        await result.current.mutateAsync(createInput).catch((caught) => {
          error = caught;
        });
      });

      expect((error as Error).message).toBe('network down');
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
