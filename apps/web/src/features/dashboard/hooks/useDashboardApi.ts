import { useQuery } from '@tanstack/react-query';
import type { DashboardPeriodBucket, ReportingPeriod } from '@mez/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { dashboardService } from '../api/dashboardService';

export const dashboardKeys = {
  all: (businessId: string) => ['dashboard', businessId] as const,
  attention: (businessId: string) => [...dashboardKeys.all(businessId), 'attention'] as const,
  summary: (businessId: string, period: ReportingPeriod) =>
    [...dashboardKeys.all(businessId), 'summary', period.from, period.to] as const,
  trend: (businessId: string, period: ReportingPeriod, bucket: DashboardPeriodBucket) =>
    [...dashboardKeys.all(businessId), 'trend', period.from, period.to, bucket] as const,
  performance: (businessId: string, period: ReportingPeriod) =>
    [...dashboardKeys.all(businessId), 'performance', period.from, period.to] as const,
  paymentSummary: (businessId: string, period: ReportingPeriod) =>
    [...dashboardKeys.all(businessId), 'payments', period.from, period.to] as const,
  disabled: (section: string) => ['dashboard', 'disabled', section] as const,
} as const;

export function useDashboardAttention(enabled = true) {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey: businessId
      ? dashboardKeys.attention(businessId)
      : dashboardKeys.disabled('attention'),
    queryFn: () => {
      if (!businessId) throw new Error('No business selected');
      return dashboardService.getAttention(businessId);
    },
    enabled: enabled && Boolean(businessId),
  });
}

export function useDashboardSummary(period: ReportingPeriod, enabled = true) {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey: businessId
      ? dashboardKeys.summary(businessId, period)
      : dashboardKeys.disabled('summary'),
    queryFn: () => {
      if (!businessId) throw new Error('No business selected');
      return dashboardService.getSummary(businessId, period);
    },
    enabled: enabled && Boolean(businessId),
  });
}

export function useDashboardTrend(
  period: ReportingPeriod,
  bucket: DashboardPeriodBucket,
  enabled = true,
) {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey: businessId
      ? dashboardKeys.trend(businessId, period, bucket)
      : dashboardKeys.disabled('trend'),
    queryFn: () => {
      if (!businessId) throw new Error('No business selected');
      return dashboardService.getTrend(businessId, period, bucket);
    },
    enabled: enabled && Boolean(businessId),
  });
}

export function useDashboardPerformance(period: ReportingPeriod, enabled = true) {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey: businessId
      ? dashboardKeys.performance(businessId, period)
      : dashboardKeys.disabled('performance'),
    queryFn: () => {
      if (!businessId) throw new Error('No business selected');
      return dashboardService.getMemberPerformance(businessId, period);
    },
    enabled: enabled && Boolean(businessId),
  });
}

export function usePaymentSummary(period: ReportingPeriod, enabled = true) {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useQuery({
    queryKey: businessId
      ? dashboardKeys.paymentSummary(businessId, period)
      : dashboardKeys.disabled('payments'),
    queryFn: () => {
      if (!businessId) throw new Error('No business selected');
      return dashboardService.getPaymentSummary(businessId, period);
    },
    enabled: enabled && Boolean(businessId),
  });
}
