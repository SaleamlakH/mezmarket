import { Link, Outlet, useLocation } from 'react-router';
import { ArrowLeft, Settings } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { Sidebar } from '@/components/Sidebar';
import { BottomTabBar } from '@/components/BottomTabBar';
import { SIDEBAR_WIDTH_STYLE, NAV_TABS } from '@/layouts/navigation';

const SETTINGS_PATH = '/settings';

export function AppLayout() {
  const { pathname } = useLocation();
  const onSettings = pathname === SETTINGS_PATH;

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
          {onSettings ? (
            <>
              <Link
                to="/"
                aria-label="Back to dashboard"
                title="Back"
                className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-(--text) hover:bg-(--surface-secondary)"
              >
                <ArrowLeft aria-hidden className="h-5 w-5" />
              </Link>
              <span className="flex-1 truncate text-center text-base font-semibold text-(--text)">
                Settings
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
          className={`flex-1 overflow-y-auto px-4 pt-6 lg:px-6 ${onSettings ? 'pb-6' : 'pb-24 lg:pb-6'}`}
        >
          <Outlet />
        </main>
      </div>

      {!onSettings && <BottomTabBar tabs={NAV_TABS} />}
    </div>
  );
}
