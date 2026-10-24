import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DashboardFixtureRole, DashboardFixtures } from './dashboardFixtures';
import {
  DASHBOARD_PREVIEW_FIXTURE_ROLE,
  type DashboardPreviewContext,
  type DashboardPreviewMode,
  type DashboardPreviewState,
  type DashboardRolePreview,
} from './dashboardPreview';

interface DashboardDevFixtures {
  byRole: Record<DashboardFixtureRole, DashboardFixtures>;
  emptyByRole: Record<DashboardFixtureRole, DashboardFixtures>;
}

export interface DashboardPreviewValue extends DashboardPreviewContext {
  setMode: Dispatch<SetStateAction<DashboardPreviewMode>>;
  setState: Dispatch<SetStateAction<DashboardPreviewState>>;
  setRole: Dispatch<SetStateAction<DashboardRolePreview>>;
}

let fixturesPromise: Promise<DashboardDevFixtures | null> | null = null;

function loadFixtures(): Promise<DashboardDevFixtures | null> {
  if (!import.meta.env.DEV) return Promise.resolve(null);

  if (!fixturesPromise) {
    fixturesPromise = import('./dashboardFixtures').then((module) => ({
      byRole: module.dashboardFixturesByRole,
      emptyByRole: module.emptyDashboardFixturesByRole,
    }));
  }

  return fixturesPromise;
}

export function useDashboardPreview(): DashboardPreviewValue {
  const [mode, setMode] = useState<DashboardPreviewMode>('live');
  const [state, setState] = useState<DashboardPreviewState>('ready');
  const [role, setRole] = useState<DashboardRolePreview>('OWNER_MANAGER');
  const [devFixtures, setDevFixtures] = useState<DashboardDevFixtures | null>(null);

  const effectiveMode: DashboardPreviewMode = import.meta.env.DEV ? mode : 'live';

  useEffect(() => {
    if (!import.meta.env.DEV || effectiveMode !== 'preview' || devFixtures) return;

    let cancelled = false;
    void loadFixtures().then((loaded) => {
      if (!cancelled) setDevFixtures(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [devFixtures, effectiveMode]);

  const fixtureRole = DASHBOARD_PREVIEW_FIXTURE_ROLE[role];
  const hasFixtureState = state === 'ready' || state === 'empty';
  const selectedFixtures =
    state === 'empty' ? devFixtures?.emptyByRole[fixtureRole] : devFixtures?.byRole[fixtureRole];

  return {
    mode: effectiveMode,
    state,
    role,
    fixture: effectiveMode === 'preview' && hasFixtureState ? (selectedFixtures ?? null) : null,
    setMode,
    setState,
    setRole,
    reset: () => setState('ready'),
  };
}
