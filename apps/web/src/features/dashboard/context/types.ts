import type { ReactNode } from 'react';
import type { ReportingPeriod } from '@mez/types';
import type { DashboardCustomRange, DashboardPeriodKey } from '../lib/period';

export interface DashboardPeriodFilter {
  period: DashboardPeriodKey;
  range: ReportingPeriod;
  customRange: DashboardCustomRange;
  selectPeriod: (period: DashboardPeriodKey) => void;
  setCustomRange: (range: DashboardCustomRange) => void;
}

export interface DashboardPeriodProviderProps {
  children: ReactNode;
  now?: Date;
}
