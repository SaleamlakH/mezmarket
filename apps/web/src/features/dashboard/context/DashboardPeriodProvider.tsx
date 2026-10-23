import { DashboardPeriodContext } from './context';
import type { DashboardPeriodProviderProps } from './types';
import { usePeriodFilter } from './usePeriodFilter';

export function DashboardPeriodProvider({ children, now }: DashboardPeriodProviderProps) {
  const value = usePeriodFilter(now);
  return <DashboardPeriodContext value={value}>{children}</DashboardPeriodContext>;
}
