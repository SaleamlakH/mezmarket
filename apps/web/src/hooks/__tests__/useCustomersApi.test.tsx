import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type {
  BusinessResponse,
  CreateCustomerInput,
  CreateCustomerResponse,
  CustomerSummaryResponse,
} from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import type { CustomersApi } from '@/features/customers/api/customersService';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCustomersService } from '@/providers/customers/useCustomersService';
import { customersKeys, useCreateCustomer, useCustomers } from '../useCustomersApi';

vi.mock('@/providers/business/useBusinessContext', () => ({
  useBusinessContext: vi.fn(),
}));

vi.mock('@/providers/customers/useCustomersService', () => ({
  useCustomersService: vi.fn(),
}));

const customersService = {
  listCustomers: vi.fn(),
  createCustomer: vi.fn(),
} satisfies CustomersApi;

const customers: CustomerSummaryResponse[] = [
  { id: 'c1', name: 'Ada', contactPhone: null, contactEmail: null },
];

const createInput: CreateCustomerInput = { name: 'Ada', contactPhone: '0911' };

function businessFixture(): BusinessResponse {
  return {
    id: 'b1',
    ownerId: 'owner_1',
    name: 'Test Business',
    currencyCode: 'ETB',
    defaultTaxRate: null,
    taxOnSales: false,
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
    currentBusiness: id === null ? null : businessFixture(),
    setCurrentBusiness: vi.fn(),
    refetch: vi.fn(),
  } satisfies BusinessContextValue);
}

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useCustomersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    setBusiness('b1');
    vi.mocked(useCustomersService).mockReturnValue(customersService);
  });

  describe('useCustomers', () => {
    it('fetches the customers of the current business', async () => {
      vi.mocked(customersService.listCustomers).mockResolvedValue(customers);

      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(customersService.listCustomers).toHaveBeenCalledWith('b1');
      expect(result.current.data).toEqual(customers);
      expect(queryClient.getQueryData(customersKeys.list('b1'))).toEqual(customers);
    });

    it('stays idle while disabled', () => {
      const { result } = renderHook(() => useCustomers({ enabled: false }), { wrapper });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(customersService.listCustomers).not.toHaveBeenCalled();
    });

    it('stays idle without a selected business', () => {
      setBusiness(null);

      const { result } = renderHook(() => useCustomers(), { wrapper });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(customersService.listCustomers).not.toHaveBeenCalled();
    });
  });

  describe('useCreateCustomer', () => {
    const created = {
      id: 'c1',
      businessId: 'b1',
      name: 'Ada',
      contactPhone: '0911',
      contactEmail: null,
      active: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as CreateCustomerResponse;

    it('saves the customer for the current business and refreshes the list', async () => {
      vi.mocked(customersService.createCustomer).mockResolvedValue(created);
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateCustomer(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(createInput);
      });

      expect(customersService.createCustomer).toHaveBeenCalledWith('b1', createInput);
      await waitFor(() => expect(result.current.data).toEqual(created));
      expect(invalidate).toHaveBeenCalledWith({ queryKey: customersKeys.list('b1') });
    });

    it('rejects without calling the service when no business is selected', async () => {
      setBusiness(null);

      const { result } = renderHook(() => useCreateCustomer(), { wrapper });

      let error: unknown;
      await act(async () => {
        await result.current.mutateAsync(createInput).catch((caught) => {
          error = caught;
        });
      });

      expect(error).toEqual(expect.any(Error));
      expect((error as Error).message).toBe('No business selected');
      expect(customersService.createCustomer).not.toHaveBeenCalled();
    });

    it('propagates the service failure to the caller', async () => {
      vi.mocked(customersService.createCustomer).mockRejectedValue(new Error('network down'));

      const { result } = renderHook(() => useCreateCustomer(), { wrapper });

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
