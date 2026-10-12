import type { ReactNode } from 'react';

export type BadgeTone = 'positive' | 'warning' | 'danger' | 'neutral' | 'accent';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

const tones: Record<BadgeTone, string> = {
  positive: 'bg-[color-mix(in_srgb,var(--positive)_16%,transparent)] text-(--positive)',
  warning: 'bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-(--warning)',
  danger: 'bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-(--danger)',
  neutral: 'bg-(--surface-secondary) text-(--text-muted)',
  accent: 'bg-(--accent) text-white',
};

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
