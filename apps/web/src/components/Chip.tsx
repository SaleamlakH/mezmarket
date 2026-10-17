import type { ReactNode } from 'react';
import type { BadgeTone } from './Badge';

export interface ChipProps {
  active?: boolean;
  /** The tone a chip reads with when active. Defaults to the accent. */
  tone?: BadgeTone;
  /** How an active chip carries its tone. */
  variant?: 'solid' | 'outline';
  children: ReactNode;
}

const ACTIVE_SOLID: Record<BadgeTone, string> = {
  accent: 'border-(--accent) bg-(--accent) text-white',
  positive: 'border-(--positive) bg-(--positive) text-white',
  warning: 'border-(--warning) bg-(--warning) text-white',
  danger: 'border-(--danger) bg-(--danger) text-white',
  neutral: 'border-(--border-strong) bg-(--surface-secondary) text-(--text)',
};

const ACTIVE_OUTLINE: Record<BadgeTone, string> = {
  accent: 'border-(--accent) bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-(--accent)',
  positive:
    'border-(--positive) bg-[color-mix(in_srgb,var(--positive)_12%,transparent)] text-(--positive)',
  warning:
    'border-(--warning) bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-(--warning)',
  danger: 'border-(--danger) bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-(--danger)',
  neutral: 'border-(--border-strong) bg-(--surface-secondary) text-(--text)',
};

export function Chip({ active = false, tone = 'accent', variant = 'solid', children }: ChipProps) {
  const activeClass = variant === 'outline' ? ACTIVE_OUTLINE[tone] : ACTIVE_SOLID[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
        active ? activeClass : 'border-(--border) bg-(--field) text-(--text)'
      }`}
    >
      {children}
    </span>
  );
}
