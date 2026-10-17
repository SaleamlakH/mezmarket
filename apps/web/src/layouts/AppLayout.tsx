import type { ComponentType } from 'react';
import { Link, Outlet, useLocation, useMatches } from 'react-router';
import { ArrowLeft, Settings } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { Sidebar } from '@/components/Sidebar';
import { BottomTabBar } from '@/components/BottomTabBar';
import {
  SETTINGS_PATH,
  PROFILE_PATH,
  BATCHES_PATH,
  INVENTORY_PATH,
  SALES_PATH,
  SALES_ALL_PATH,
  SIDEBAR_WIDTH_STYLE,
  NAV_TABS,
} from '@/layouts/navigation';

/**
 * Routes that replace the app header with a back arrow and their own title,
 * since they sit below a tab rather than alongside the others.
 */
const SUB_ROUTES = [
  { path: SETTINGS_PATH, title: 'Settings', backTo: '/' },
  { path: PROFILE_PATH, title: 'Profile', backTo: SETTINGS_PATH },
  { path: BATCHES_PATH, title: 'Batches', backTo: INVENTORY_PATH },
  { path: SALES_ALL_PATH, title: 'Sales', backTo: SALES_PATH },
];

/**
 * A route's `handle` may name a component for the layout to dock in an aside
 * beside the page — the sales route uses it for the current-sale panel.
 */
export interface AppRouteHandle {
  aside?: ComponentType;
}

export function AppLayout() {
  const { pathname } = useLocation();
  const subRoute = SUB_ROUTES.find((route) => route.path === pathname);
  const matches = useMatches();
  const Aside = matches
    .map((match) => match.handle as AppRouteHandle | undefined)
    .find((handle) => handle?.aside)?.aside;

  return (
    <div className="self-start flex h-full w-full">
      <Sidebar
        tabs={NAV_TABS}
        settingsPath={SETTINGS_PATH}
        sidebarWidthStyle={SIDEBAR_WIDTH_STYLE}
      />

      <div style={SIDEBAR_WIDTH_STYLE} className="hidden lg:block" />
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 lg:hidden">
          {subRoute ? (
            <>
              <Link
                to={subRoute.backTo}
                aria-label="Back"
                title="Back"
                className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-(--text) hover:bg-(--surface-secondary)"
              >
                <ArrowLeft aria-hidden className="h-5 w-5" />
              </Link>
              <span className="flex-1 truncate text-center text-base font-semibold text-(--text)">
                {subRoute.title}
              </span>
              <span aria-hidden className="h-10 w-10 shrink-0" />
            </>
          ) : (
            <>
              <Brand />
              <Link
                to={SETTINGS_PATH}
                aria-label="Settings"
                title="Settings"
                className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-(--border) bg-(--field) text-(--text) transition-colors hover:bg-(--accent) hover:text-white focus-visible:bg-(--accent) focus-visible:text-white"
              >
                <Settings aria-hidden className="h-5 w-5" />
              </Link>
            </>
          )}
        </header>

        <div
          className={`flex min-w-0 flex-1 gap-3 px-4 sm:pt-6 lg:px-6 ${
            subRoute ? 'pb-6' : 'pb-24 lg:pb-6'
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

      {!subRoute && <BottomTabBar tabs={NAV_TABS} />}
    </div>
  );
}
