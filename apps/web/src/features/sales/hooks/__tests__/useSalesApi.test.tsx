import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type {
  BusinessResponse,
  CreateSaleInput,
  CreateSaleResponse,
  RecordPaymentInput,
  SaleDetailResponse,
} from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import { salesService } from '../../api/salesService';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { catalogKeys } from '@/hooks/useCatalogApi';
import {
  salesKeys,
  useCreateSale,
  useRecordPayment,
  useSaleDetail,
  useSales,
} from '../useSalesApi';
import { sale, sales } from '../../__tests__/fixtures';

vi.mock('../../api/salesService', () => ({
  salesService: {
    getSales: vi.fn(),
    getSale: vi.fn(),
    createSale: vi.fn(),
    recordPayment: vi.fn(),
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

const createInput: CreateSaleInput = {
  lines: [{ productId: 'prod_tequila', productUnitId: 'unit_tequila_bottle', quantity: 2 }],
};

describe('useSalesApi', () => {
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

  describe('useSales', () => {
    it('fetches the sales of the current business', async () => {
      vi.mocked(salesService.getSales).mockResolvedValue(sales);

      const { result } = renderHook(() => useSales(), { wrapper });

      expect(result.current.isPending).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(salesService.getSales).toHaveBeenCalledWith('b1', {});
      expect(result.current.data).toEqual(sales);
      expect(queryClient.getQueryData(salesKeys.list('b1', {}))).toEqual(sales);
    });

    it('fetches the sales narrowed by the filter and caches each filter separately', async () => {
      vi.mocked(salesService.getSales).mockResolvedValue(sales);

      const { result } = renderHook(() => useSales({ unpaid: true }), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(salesService.getSales).toHaveBeenCalledWith('b1', { unpaid: true });
      expect(queryClient.getQueryData(salesKeys.list('b1', { unpaid: true }))).toEqual(sales);
      expect(queryClient.getQueryData(salesKeys.list('b1', {}))).toBeUndefined();
    });

    it('stays idle without a selected business', () => {
      setBusiness(null);

      const { result } = renderHook(() => useSales(), { wrapper });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(salesService.getSales).not.toHaveBeenCalled();
    });
  });

  describe('useSaleDetail', () => {
    it('fetches a single sale', async () => {
      vi.mocked(salesService.getSale).mockResolvedValue(sale as SaleDetailResponse);

      const { result } = renderHook(() => useSaleDetail('sale_inv_2042'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(salesService.getSale).toHaveBeenCalledWith('b1', 'sale_inv_2042');
      expect(result.current.data).toEqual(sale);
    });

    it('stays idle without saleId', () => {
      const { result } = renderHook(() => useSaleDetail(undefined), { wrapper });
      expect(result.current.fetchStatus).toBe('idle');
      expect(salesService.getSale).not.toHaveBeenCalled();
    });
  });

  describe('useCreateSale', () => {
    it('creates the sale for the current business and refreshes the history', async () => {
      const created = sale as SaleDetailResponse;
      vi.mocked(salesService.createSale).mockResolvedValue(created as CreateSaleResponse);
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateSale(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(createInput);
      });

      expect(salesService.createSale).toHaveBeenCalledWith('b1', createInput);
      await waitFor(() => expect(result.current.data).toEqual(created));
      expect(invalidate).toHaveBeenCalledWith({ queryKey: salesKeys.lists('b1') });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: catalogKeys.products('b1') });
    });

    it('rejects without calling the service when no business is selected', async () => {
      setBusiness(null);

      const { result } = renderHook(() => useCreateSale(), { wrapper });

      let error: unknown;
      await act(async () => {
        await result.current.mutateAsync(createInput).catch((caught) => {
          error = caught;
        });
      });

      expect(error).toEqual(expect.any(Error));
      expect((error as Error).message).toBe('No business selected');
      expect(salesService.createSale).not.toHaveBeenCalled();
    });

    it('propagates the service failure to the caller', async () => {
      vi.mocked(salesService.createSale).mockRejectedValue(new Error('network down'));

      const { result } = renderHook(() => useCreateSale(), { wrapper });

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

  describe('useRecordPayment', () => {
    const payment: RecordPaymentInput = { status: 'PAID', method: 'CASH' };

    it('records a payment and refreshes the detail and the history', async () => {
      const settled = { ...sale, paymentStatus: 'PAID' as const, balanceDue: 0 };
      vi.mocked(salesService.recordPayment).mockResolvedValue(settled);
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRecordPayment('sale_inv_2042'), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(payment);
      });

      expect(salesService.recordPayment).toHaveBeenCalledWith('b1', 'sale_inv_2042', payment);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: salesKeys.lists('b1') });
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: salesKeys.detail('b1', 'sale_inv_2042'),
      });
    });

    it('rejects without calling the service when no sale is selected', async () => {
      const { result } = renderHook(() => useRecordPayment(undefined), { wrapper });

      let error: unknown;
      await act(async () => {
        await result.current.mutateAsync(payment).catch((caught) => {
          error = caught;
        });
      });

      expect((error as Error).message).toBe('No sale selected');
      expect(salesService.recordPayment).not.toHaveBeenCalled();
    });
  });
});
