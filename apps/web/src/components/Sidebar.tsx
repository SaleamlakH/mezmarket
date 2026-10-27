import { Link, NavLink } from 'react-router';
import { LogOut, Settings, Store } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toast } from '@/components/Toast';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useSignOut } from '@/hooks/useSignOut';
import type { CSSProperties } from 'react';
import type { NavTab } from '@/layouts/navigation';

interface SidebarProps {
  tabs: NavTab[];
  settingsPath: string;
  businessPath: string;
  sidebarWidthStyle: CSSProperties;
}

function tabClass({ isActive }: { isActive: boolean }) {
  return `focus-ring flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-(--surface-secondary) text-(--accent)'
      : 'text-(--text-muted) hover:text-(--text)'
  }`;
}

export function Sidebar({ tabs, settingsPath, businessPath, sidebarWidthStyle }: SidebarProps) {
  const { currentBusiness } = useBusinessContext();
  const { signOut, isSigningOut, error, clearError } = useSignOut();

  return (
    <aside
      aria-label="Primary"
      style={sidebarWidthStyle}
      className="fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col border-r border-(--border) bg-(--surface-primary) px-4 py-5 lg:flex"
    >
      {error && (
        <Toast
          message={error}
          variant="error"
          duration={5000}
          position="top-right"
          onDismiss={clearError}
        />
      )}

      <div className="px-2">
        <Brand />
      </div>

      {currentBusiness && (
        <Link
          to={businessPath}
          title={currentBusiness.name}
          className="focus-ring mt-3 flex items-center gap-2 rounded-lg border border-(--border) bg-(--surface-secondary) px-3 py-2 transition-colors hover:border-(--accent)"
        >
          <Store size={15} aria-hidden className="shrink-0 text-(--text-muted)" />
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold tracking-[0.08em] uppercase text-(--text-muted)">
              Business
            </span>
            <span className="block truncate text-sm font-semibold text-(--text)">
              {currentBusiness.name}
            </span>
          </span>
        </Link>
      )}

      <nav aria-label="Primary" className="mt-8 flex flex-col gap-1">
        {tabs.map((tab) => (
          <NavLink key={tab.key} to={tab.path} end={tab.path === '/'} className={tabClass}>
            <span className="h-5 w-5">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-(--border) pt-4">
        <NavLink to={settingsPath} className={tabClass}>
          <span className="h-5 w-5">
            <Settings aria-hidden />
          </span>
          Settings
        </NavLink>

        <ThemeToggle variant="nav" />

        <button
          type="button"
          onClick={signOut}
          disabled={isSigningOut}
          className="focus-ring flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-(--danger) transition-colors hover:text-[color-mix(in_srgb,var(--danger)_80%,black)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="h-5 w-5">
            <LogOut aria-hidden />
          </span>
          {isSigningOut ? 'Logging out…' : 'Logout'}
        </button>
      </div>
    </aside>
  );
}
