import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type {
  AttentionResponse,
  BusinessResponse,
  DashboardSummaryResponse,
  DashboardTrendResponse,
  MemberPerformanceResponse,
  PaymentSummaryResponse,
  ReportingPeriod,
} from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import { dashboardService } from '@/features/dashboard/api/dashboardService';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import {
  dashboardKeys,
  useDashboardAttention,
  useDashboardPerformance,
  useDashboardSummary,
  useDashboardTrend,
  usePaymentSummary,
} from '../useDashboardApi';

vi.mock('@/features/dashboard/api/dashboardService', () => ({
  dashboardService: {
    getAttention: vi.fn(),
    getSummary: vi.fn(),
    getTrend: vi.fn(),
    getMemberPerformance: vi.fn(),
    getPaymentSummary: vi.fn(),
  },
}));

vi.mock('@/providers/business/useBusinessContext', () => ({
  useBusinessContext: vi.fn(),
}));

const period: ReportingPeriod = {
  from: '2026-10-01T00:00:00.000Z',
  to: '2026-10-08T00:00:00.000Z',
};
const asOf = '2026-10-08T00:00:00.000Z';

const attention: AttentionResponse = {
  asOf,
  stock: { count: 0, lowCount: 0, outCount: 0, preview: [] },
  expiring: { lotCount: 0, expiredLotCount: 0, expiringLotCount: 0, earliest: null },
  unpaid: { count: 0, total: 0, overdue: { count: 0, total: 0 } },
};

const summary: DashboardSummaryResponse = {
  period,
  asOf,
  sales: { total: 0, count: 0 },
  cashCollected: { total: 0, paymentCount: 0 },
};

const trend: DashboardTrendResponse = {
  period,
  bucket: 'day',
  points: [],
};

const performance: MemberPerformanceResponse = {
  member: { id: 'member_1', name: 'Member', role: 'OWNER' },
  period,
  asOf,
  sales: { total: 0, count: 0 },
  cashCollected: 0,
  unpaidSalesCount: 0,
};

const paymentSummary: PaymentSummaryResponse = {
  period,
  groupBy: 'method',
  total: 0,
  methods: [],
};

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

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useDashboardApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    setBusiness('b1');
  });

  it('fetches attention for the current business', async () => {
    vi.mocked(dashboardService.getAttention).mockResolvedValue(attention);

    const { result } = renderHook(() => useDashboardAttention(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(dashboardService.getAttention).toHaveBeenCalledWith('b1');
    expect(result.current.data).toEqual(attention);
    expect(queryClient.getQueryData(dashboardKeys.attention('b1'))).toEqual(attention);
  });

  it('fetches the summary for the current business and period', async () => {
    vi.mocked(dashboardService.getSummary).mockResolvedValue(summary);

    const { result } = renderHook(() => useDashboardSummary(period), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(dashboardService.getSummary).toHaveBeenCalledWith('b1', period);
    expect(result.current.data).toEqual(summary);
    expect(queryClient.getQueryData(dashboardKeys.summary('b1', period))).toEqual(summary);
  });

  it('fetches the trend for the current business, period, and bucket', async () => {
    vi.mocked(dashboardService.getTrend).mockResolvedValue(trend);

    const { result } = renderHook(() => useDashboardTrend(period, 'day'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(dashboardService.getTrend).toHaveBeenCalledWith('b1', period, 'day');
    expect(result.current.data).toEqual(trend);
    expect(queryClient.getQueryData(dashboardKeys.trend('b1', period, 'day'))).toEqual(trend);
  });

  it('fetches the current member performance for the period', async () => {
    vi.mocked(dashboardService.getMemberPerformance).mockResolvedValue(performance);

    const { result } = renderHook(() => useDashboardPerformance(period), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(dashboardService.getMemberPerformance).toHaveBeenCalledWith('b1', period);
    expect(result.current.data).toEqual(performance);
    expect(queryClient.getQueryData(dashboardKeys.performance('b1', period))).toEqual(performance);
  });

  it('fetches the payment summary for the period', async () => {
    vi.mocked(dashboardService.getPaymentSummary).mockResolvedValue(paymentSummary);

    const { result } = renderHook(() => usePaymentSummary(period), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(dashboardService.getPaymentSummary).toHaveBeenCalledWith('b1', period);
    expect(result.current.data).toEqual(paymentSummary);
    expect(queryClient.getQueryData(dashboardKeys.paymentSummary('b1', period))).toEqual(
      paymentSummary,
    );
  });

  it('stays idle without a selected business', () => {
    setBusiness(null);

    const { result } = renderHook(() => useDashboardSummary(period), { wrapper });

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
    expect(dashboardService.getSummary).not.toHaveBeenCalled();
  });

  it('exposes a failed request without replacing the error', async () => {
    vi.mocked(dashboardService.getAttention).mockRejectedValue(new Error('request failed'));

    const { result } = renderHook(() => useDashboardAttention(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(expect.any(Error));
    expect(result.current.data).toBeUndefined();
  });
});
