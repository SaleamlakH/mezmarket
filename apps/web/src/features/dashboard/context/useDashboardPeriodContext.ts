import { useContext } from 'react';
import { DashboardPeriodContext } from './context';
import type { DashboardPeriodFilter } from './types';

export function useDashboardPeriodContext(): DashboardPeriodFilter {
  const context = useContext(DashboardPeriodContext);
  if (!context) {
    throw new Error('useDashboardPeriodContext must be used within a DashboardPeriodProvider');
  }
  return context;
}
