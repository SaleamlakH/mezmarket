import { NavLink } from 'react-router';
import { Settings } from 'lucide-react';
import { Brand } from '@/components/Brand';
import type { CSSProperties } from 'react';
import type { NavTab } from '@/layouts/navigation';

interface SidebarProps {
  tabs: NavTab[];
  settingsPath: string;
  sidebarWidthStyle: CSSProperties;
}

function tabClass({ isActive }: { isActive: boolean }) {
  return `focus-ring flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-(--surface-secondary) text-(--accent)'
      : 'text-(--text-muted) hover:text-(--text)'
  }`;
}

export function Sidebar({ tabs, settingsPath, sidebarWidthStyle }: SidebarProps) {
  return (
    <aside
      aria-label="Primary"
      style={sidebarWidthStyle}
      className="fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col border-r border-(--border) bg-(--surface-primary) px-4 py-5 lg:flex"
    >
      <div className="px-2">
        <Brand />
      </div>

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
      </div>
    </aside>
  );
}
