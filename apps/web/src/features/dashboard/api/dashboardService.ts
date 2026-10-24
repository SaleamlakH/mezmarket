import type {
  AttentionResponse,
  DashboardPeriodBucket,
  DashboardSummaryResponse,
  DashboardTrendResponse,
  MemberPerformanceResponse,
  PaymentSummaryResponse,
  ReportingPeriod,
} from '@mez/types';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface DashboardApi {
  getAttention(businessId: string): Promise<AttentionResponse>;
  getSummary(businessId: string, period: ReportingPeriod): Promise<DashboardSummaryResponse>;
  getTrend(
    businessId: string,
    period: ReportingPeriod,
    bucket: DashboardPeriodBucket,
  ): Promise<DashboardTrendResponse>;
  getMemberPerformance(
    businessId: string,
    period: ReportingPeriod,
  ): Promise<MemberPerformanceResponse>;
  getPaymentSummary(businessId: string, period: ReportingPeriod): Promise<PaymentSummaryResponse>;
}

function periodQuery(period: ReportingPeriod): string {
  return new URLSearchParams({ from: period.from, to: period.to }).toString();
}

export function createDashboardService(client: ApiClient): DashboardApi {
  return {
    getAttention(businessId) {
      return client.get<AttentionResponse>(`/api/businesses/${businessId}/dashboard/attention`);
    },

    getSummary(businessId, period) {
      return client.get<DashboardSummaryResponse>(
        `/api/businesses/${businessId}/dashboard/summary?${periodQuery(period)}`,
      );
    },

    getTrend(businessId, period, bucket) {
      const query = new URLSearchParams({
        from: period.from,
        to: period.to,
        bucket,
      }).toString();

      return client.get<DashboardTrendResponse>(
        `/api/businesses/${businessId}/dashboard/trend?${query}`,
      );
    },

    getMemberPerformance(businessId, period) {
      return client.get<MemberPerformanceResponse>(
        `/api/businesses/${businessId}/members/me/performance?${periodQuery(period)}`,
      );
    },

    getPaymentSummary(businessId, period) {
      const query = new URLSearchParams({
        from: period.from,
        to: period.to,
        groupBy: 'method',
      }).toString();

      return client.get<PaymentSummaryResponse>(
        `/api/businesses/${businessId}/payments/summary?${query}`,
      );
    },
  };
}

export const dashboardService = createDashboardService(apiClient);
