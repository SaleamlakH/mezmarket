import { ROLE_LABELS } from '../lib/roles';
import type { DashboardFixtureRole, DashboardFixtures } from './dashboardFixtures';

export type DashboardPreviewMode = 'live' | 'preview';

export type DashboardPreviewState = 'loading' | 'error' | 'empty' | 'ready';

export type DashboardRolePreview = 'OWNER_MANAGER' | 'CASHIER';

export interface DashboardPreviewContext {
  mode: DashboardPreviewMode;
  state: DashboardPreviewState;
  role: DashboardRolePreview;
  fixture: DashboardFixtures | null;
  reset: () => void;
}

export const DASHBOARD_PREVIEW_ROLE_LABELS: Record<DashboardRolePreview, string> = {
  OWNER_MANAGER: `${ROLE_LABELS.OWNER} / ${ROLE_LABELS.MANAGER}`,
  CASHIER: ROLE_LABELS.CASHIER,
};

export const DASHBOARD_PREVIEW_FIXTURE_ROLE: Record<DashboardRolePreview, DashboardFixtureRole> = {
  OWNER_MANAGER: 'OWNER',
  CASHIER: 'CASHIER',
};
