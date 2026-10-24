import { createContext } from 'react';
import type { DashboardPeriodFilter } from './types';

export const DashboardPeriodContext = createContext<DashboardPeriodFilter | null>(null);
