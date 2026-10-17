import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { BusinessResponse, SaleDetailResponse } from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { salesService } from '../../api/salesService';
import { usePaymentForm, type PaymentMode } from '../usePaymentForm';

vi.mock('../../api/salesService', () => ({
  salesService: {
    recordPayment: vi.fn(),
  },
}));

vi.mock('@/providers/business/useBusinessContext', () => ({
  useBusinessContext: vi.fn(),
}));

function businessFixture(): BusinessResponse {
  return {
    id: 'b1',
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

describe('usePaymentForm', () => {
  let queryClient: QueryClient;
  let onRecorded: () => void;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  function render(mode: PaymentMode) {
    return renderHook(() => usePaymentForm('sale_1', mode, onRecorded), { wrapper });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });
    onRecorded = vi.fn();
    vi.mocked(useBusinessContext).mockReturnValue({
      status: 'ready',
      businesses: [],
      currentBusiness: businessFixture(),
      setCurrentBusiness: vi.fn(),
      refetch: vi.fn(),
    } satisfies BusinessContextValue);
    vi.mocked(salesService.recordPayment).mockResolvedValue({} as SaleDetailResponse);
  });

  it('sends a paid payment and leaves the amount to the server', async () => {
    const { result } = render('paid');

    act(() => result.current.setValue('method', 'CARD'));
    await act(async () => result.current.submit());

    await waitFor(() =>
      expect(salesService.recordPayment).toHaveBeenCalledWith('b1', 'sale_1', {
        status: 'PAID',
        method: 'CARD',
      }),
    );
    await waitFor(() => expect(onRecorded).toHaveBeenCalled());
  });

  it('sends a partial payment with the exact typed amount', async () => {
    const { result } = render('partial');

    act(() => result.current.setValue('amount', '300.5'));
    act(() => result.current.setValue('method', 'CARD'));
    act(() => result.current.setValue('methodDetail', 'ref 42'));
    await act(async () => result.current.submit());

    await waitFor(() =>
      expect(salesService.recordPayment).toHaveBeenCalledWith('b1', 'sale_1', {
        status: 'PARTIALLY_PAID',
        amount: 300.5,
        method: 'CARD',
        methodDetail: 'ref 42',
      }),
    );
  });

  it('sends the exact typed amount however far it goes past the balance', async () => {
    const { result } = render('partial');

    act(() => result.current.setValue('amount', '5000'));
    act(() => result.current.setValue('method', 'CASH'));
    await act(async () => result.current.submit());

    await waitFor(() =>
      expect(salesService.recordPayment).toHaveBeenCalledWith('b1', 'sale_1', {
        status: 'PARTIALLY_PAID',
        amount: 5000,
        method: 'CASH',
      }),
    );
  });

  it('refuses a partial payment with no amount', async () => {
    const { result } = render('partial');

    act(() => result.current.setValue('method', 'CASH'));
    await act(async () => result.current.submit());

    await waitFor(() => expect(result.current.paymentErrors.amount).toEqual(expect.any(String)));
    expect(salesService.recordPayment).not.toHaveBeenCalled();
  });

  it('refuses a payment with no method', async () => {
    const { result } = render('partial');

    act(() => result.current.setValue('amount', '300'));
    await act(async () => result.current.submit());

    await waitFor(() => expect(result.current.paymentErrors.method).toEqual(expect.any(String)));
    expect(salesService.recordPayment).not.toHaveBeenCalled();
  });

  it('surfaces the server failure without reporting a recording', async () => {
    vi.mocked(salesService.recordPayment).mockRejectedValue(new Error());
    const { result } = render('paid');

    act(() => result.current.setValue('method', 'CASH'));
    await act(async () => result.current.submit());

    await waitFor(() => expect(result.current.serverError).toEqual(expect.any(String)));
    expect(onRecorded).not.toHaveBeenCalled();
  });
});
