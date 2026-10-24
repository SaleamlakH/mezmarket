import { pluralize } from '@/lib/format';
import type { DashboardPeriodKey } from './period';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_TOLERANCE_MS = HOUR_MS;

interface GrossProfitComparison {
  deltaPercent: number | null;
  previous: number;
}

export function comparisonLabel(periodKey: DashboardPeriodKey, from: string, to: string): string {
  if (periodKey === 'today') return 'vs yesterday';
  if (periodKey === 'week') return 'vs last week';
  if (periodKey === 'month') return 'vs last month';

  const fromTime = Date.parse(from);
  const toTime = Date.parse(to);
  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || toTime <= fromTime) {
    return 'vs previous period';
  }

  const span = toTime - fromTime;
  const days = Math.round(span / DAY_MS);
  if (days >= 1 && Math.abs(span - days * DAY_MS) <= DAY_TOLERANCE_MS) {
    return `vs previous ${days} ${pluralize(days, 'day')}`;
  }

  const hours = Math.max(1, Math.round(span / HOUR_MS));
  return `vs previous ${hours} ${pluralize(hours, 'hour')}`;
}

export function grossProfitComparisonLabel(
  grossProfit: GrossProfitComparison,
  periodKey: DashboardPeriodKey,
  from: string,
  to: string,
): string | null {
  if (grossProfit.deltaPercent === null || grossProfit.previous <= 0) return null;
  return comparisonLabel(periodKey, from, to);
}
