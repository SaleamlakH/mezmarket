import { useCallback, useMemo, useState } from 'react';
import {
  dashboardCustomRangeDefaults,
  dashboardPeriodRange,
  type DashboardCustomRange,
  type DashboardPeriodKey,
} from '../lib/period';
import type { DashboardPeriodFilter } from './types';

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
