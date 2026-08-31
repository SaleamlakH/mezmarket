import type { ReactNode } from 'react';

export interface ChipProps {
  active?: boolean;
  children: ReactNode;
}

export function Chip({ active = false, children }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
        active
          ? 'border-(--accent) bg-(--accent) text-white'
          : 'border-(--border) bg-(--field) text-(--text)'
      }`}
    >
      {children}
    </span>
  );
}
