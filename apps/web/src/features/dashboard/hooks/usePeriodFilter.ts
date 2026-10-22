import { useCallback, useMemo, useState } from 'react';
import type { ReportingPeriod } from '@mez/types';
import {
  dashboardCustomRangeDefaults,
  dashboardPeriodRange,
  type DashboardCustomRange,
  type DashboardPeriodKey,
} from '../lib/period';

export interface DashboardPeriodFilter {
  period: DashboardPeriodKey;
  range: ReportingPeriod;
  customRange: DashboardCustomRange;
  selectPeriod: (period: DashboardPeriodKey) => void;
  setCustomRange: (range: DashboardCustomRange) => void;
}

/**
 * Holds the selected period. `now` is fixed for the life of the hook so the
 * range cannot change halfway through a render or a retry.
 */
export function usePeriodFilter(now?: Date): DashboardPeriodFilter {
  const [referenceNow] = useState(() => now ?? new Date());
  const [period, setPeriod] = useState<DashboardPeriodKey>('today');
  const [customRange, setCustomRangeState] = useState<DashboardCustomRange>(() =>
    dashboardCustomRangeDefaults(referenceNow),
  );

  const range = useMemo(
    () => dashboardPeriodRange(period, customRange, referenceNow),
    [period, customRange, referenceNow],
  );

  const selectPeriod = useCallback((next: DashboardPeriodKey) => {
    setPeriod(next);
  }, []);

  const setCustomRange = useCallback((next: DashboardCustomRange) => {
    setCustomRangeState(next);
    setPeriod('custom');
  }, []);

  return { period, range, customRange, selectPeriod, setCustomRange };
}
