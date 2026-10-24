import type { ComponentType } from 'react';
import { Link, Outlet, useMatches } from 'react-router';
import { Settings, Store } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { Sidebar } from '@/components/Sidebar';
import { BottomTabBar } from '@/components/BottomTabBar';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  SETTINGS_PATH,
  SETTINGS_BUSINESS_PATH,
  SIDEBAR_WIDTH_STYLE,
  NAV_TABS,
} from '@/layouts/navigation';
import { useBusinessContext } from '@/providers/business/useBusinessContext';

/**
 * A route's `handle` may name a component for the layout to dock in an aside
 * beside the page — the sales route uses it for the current-sale panel — or
 * mark the page as nested so the bottom tabs make way for a back control.
 */
export interface AppRouteHandle {
  aside?: ComponentType;
  subPage?: boolean;
}

export function AppLayout() {
  const matches = useMatches();
  const handles = matches.map((match) => match.handle as AppRouteHandle | undefined);
  const Aside = handles.find((handle) => handle?.aside)?.aside;
  const isSubPage = handles.some((handle) => handle?.subPage);
  const { currentBusiness } = useBusinessContext();

  return (
    <div className="self-start flex h-full w-full">
      <Sidebar
        tabs={NAV_TABS}
        settingsPath={SETTINGS_PATH}
        businessPath={SETTINGS_BUSINESS_PATH}
        sidebarWidthStyle={SIDEBAR_WIDTH_STYLE}
      />

      <div style={SIDEBAR_WIDTH_STYLE} className="hidden lg:block" />
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {!isSubPage && (
          <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 lg:hidden">
            <div className="flex min-w-0 flex-col items-start gap-1">
              <Brand />
              {currentBusiness && (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-(--surface-secondary) px-2 py-1 text-xs font-semibold text-(--text)">
                  <Store aria-hidden size={13} className="shrink-0 text-(--accent)" />
                  <span className="truncate">{currentBusiness.name}</span>
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <Link
                to={SETTINGS_PATH}
                aria-label="Settings"
                title="Settings"
                className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-(--border) bg-(--field) text-(--text) transition-colors hover:bg-(--accent) hover:text-white focus-visible:bg-(--accent) focus-visible:text-white"
              >
                <Settings aria-hidden className="h-5 w-5" />
              </Link>
            </div>
          </header>
        )}

        <div
          className={`flex min-w-0 flex-1 gap-3 px-4 sm:pt-6 lg:px-6 ${
            isSubPage ? 'pt-4 pb-6' : 'pb-24 lg:pb-6'
          }`}
        >
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>

      {Aside && (
        <aside aria-label="Current sale" className="hidden shrink-0 md:block">
          <Aside />
        </aside>
      )}

      {!isSubPage && <BottomTabBar tabs={NAV_TABS} />}
    </div>
  );
}
