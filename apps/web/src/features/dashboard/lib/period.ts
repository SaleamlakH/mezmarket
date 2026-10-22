import type { DashboardPeriodBucket, ReportingPeriod } from '@mez/types';

export type DashboardPeriodKey = 'today' | 'week' | 'month' | 'custom';

export interface DashboardCustomRange {
  /** Local calendar day, as a `YYYY-MM-DD` date input value. */
  start: string;
  /** Local calendar day, inclusive. */
  end: string;
}

export interface DashboardPeriodOption {
  key: DashboardPeriodKey;
  label: string;
}

export const DASHBOARD_PERIOD_OPTIONS: readonly DashboardPeriodOption[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 days' },
  { key: 'month', label: 'Month' },
  { key: 'custom', label: 'Custom' },
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** The `YYYY-MM-DD` value a date input shows for a local calendar day. */
export function toLocalDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Reads a `YYYY-MM-DD` date input value as local midnight, or null when invalid. */
export function parseLocalDateInputValue(value: string): Date | null {
  const parts = value.split('-');
  if (parts.length !== 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function dashboardCustomRangeDefaults(now = new Date()): DashboardCustomRange {
  const today = toLocalDateInputValue(startOfLocalDay(now));
  return { start: today, end: today };
}

/**
 * Builds the half-open UTC range the API expects. Local calendar days are
 * turned into instants exactly once, so the server never needs a timezone.
 */
export function dashboardPeriodRange(
  period: DashboardPeriodKey,
  customRange: DashboardCustomRange,
  now = new Date(),
): ReportingPeriod {
  const today = startOfLocalDay(now);

  if (period === 'today') {
    return { from: today.toISOString(), to: addLocalDays(today, 1).toISOString() };
  }

  if (period === 'week') {
    return {
      from: addLocalDays(today, -6).toISOString(),
      to: addLocalDays(today, 1).toISOString(),
    };
  }

  if (period === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  const selectedStart = parseLocalDateInputValue(customRange.start) ?? today;
  const selectedEnd = parseLocalDateInputValue(customRange.end) ?? selectedStart;
  const from = selectedStart <= selectedEnd ? selectedStart : selectedEnd;
  const lastDay = selectedStart <= selectedEnd ? selectedEnd : selectedStart;

  return { from: from.toISOString(), to: addLocalDays(lastDay, 1).toISOString() };
}

/** Today is dense enough to read hourly; every longer range reads by day. */
export function dashboardTrendBucket(period: DashboardPeriodKey): DashboardPeriodBucket {
  return period === 'today' ? 'hour' : 'day';
}
