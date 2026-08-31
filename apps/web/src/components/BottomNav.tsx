import type { ReactNode } from 'react';

export interface BottomNavTab {
  key: string;
  label: string;
  icon: ReactNode;
}

export interface BottomNavProps {
  tabs: BottomNavTab[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function BottomNav({ tabs, activeKey, onChange }: BottomNavProps) {
  return (
    <nav className="flex max-w-[340px] overflow-hidden rounded-2xl border border-(--border) bg-(--surface-primary)">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`focus-ring flex flex-1 cursor-pointer flex-col items-center gap-1 border-none bg-transparent px-1 py-2.5 text-[10px] font-semibold transition-colors ${
              active ? 'text-(--accent)' : 'text-(--text-muted) hover:text-(--text)'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
