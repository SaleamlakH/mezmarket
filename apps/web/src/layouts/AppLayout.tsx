import { Link, Outlet, useLocation } from 'react-router';
import { ArrowLeft, Settings } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { Sidebar } from '@/components/Sidebar';
import { BottomTabBar } from '@/components/BottomTabBar';
import {
  SETTINGS_PATH,
  PROFILE_PATH,
  BATCHES_PATH,
  INVENTORY_PATH,
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
];

export function AppLayout() {
  const { pathname } = useLocation();
  const subRoute = SUB_ROUTES.find((route) => route.path === pathname);

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

        <main
          className={`flex-1 overflow-y-auto px-4 sm:pt-6 lg:px-6 ${subRoute ? 'pb-6' : 'pb-24 lg:pb-6'}`}
        >
          <Outlet />
        </main>
      </div>

      {!subRoute && <BottomTabBar tabs={NAV_TABS} />}
    </div>
  );
}
