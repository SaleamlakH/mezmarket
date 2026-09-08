import { NavLink } from 'react-router';
import type { NavTab } from '@/layouts/navigation';

interface BottomTabBarProps {
  tabs: NavTab[];
}

export function BottomTabBar({ tabs }: BottomTabBarProps) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-(--border) bg-(--surface-primary) lg:hidden"
    >
      <div className="flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) =>
              `focus-ring flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1 px-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-(--accent)' : 'text-(--text-muted) hover:text-(--text)'
              }`
            }
          >
            <span className="h-5 w-5">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
