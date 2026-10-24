import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AttentionResponse,
  DashboardSummaryResponse,
  DashboardTrendResponse,
  MemberPerformanceResponse,
  PaymentSummaryResponse,
  ReportingPeriod,
} from '@mez/types';
import type { ApiClient } from '@/lib/apiClient';
import { createDashboardService } from '../dashboardService';

function makeClient(): ApiClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  };
}

const period: ReportingPeriod = {
  from: '2026-10-01T00:00:00.000Z',
  to: '2026-10-08T00:00:00.000Z',
};
const periodQuery = new URLSearchParams(period).toString();
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

describe('dashboardService', () => {
  let client: ApiClient;
  let service: ReturnType<typeof createDashboardService>;

  beforeEach(() => {
    client = makeClient();
    service = createDashboardService(client);
  });

  it('gets attention for the business', async () => {
    vi.mocked(client.get).mockResolvedValue(attention);

    await expect(service.getAttention('b-1')).resolves.toBe(attention);

    expect(client.get).toHaveBeenCalledWith('/api/businesses/b-1/dashboard/attention');
  });

  it('gets the summary with the reporting period in the query', async () => {
    vi.mocked(client.get).mockResolvedValue(summary);

    await expect(service.getSummary('b-1', period)).resolves.toBe(summary);

    expect(client.get).toHaveBeenCalledWith(`/api/businesses/b-1/dashboard/summary?${periodQuery}`);
  });

  it('gets the trend with the reporting period and bucket in the query', async () => {
    vi.mocked(client.get).mockResolvedValue(trend);

    await expect(service.getTrend('b-1', period, 'day')).resolves.toBe(trend);

    expect(client.get).toHaveBeenCalledWith(
      `/api/businesses/b-1/dashboard/trend?${new URLSearchParams({
        ...period,
        bucket: 'day',
      }).toString()}`,
    );
  });

  it('gets the current member performance with the reporting period in the query', async () => {
    vi.mocked(client.get).mockResolvedValue(performance);

    await expect(service.getMemberPerformance('b-1', period)).resolves.toBe(performance);

    expect(client.get).toHaveBeenCalledWith(
      `/api/businesses/b-1/members/me/performance?${periodQuery}`,
    );
  });

  it('gets the payment summary grouped by method', async () => {
    vi.mocked(client.get).mockResolvedValue(paymentSummary);

    await expect(service.getPaymentSummary('b-1', period)).resolves.toBe(paymentSummary);

    expect(client.get).toHaveBeenCalledWith(
      `/api/businesses/b-1/payments/summary?${new URLSearchParams({
        ...period,
        groupBy: 'method',
      }).toString()}`,
    );
  });
});
