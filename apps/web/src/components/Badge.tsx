import type { ReactNode } from 'react';

export type BadgeTone = 'positive' | 'warning' | 'danger' | 'neutral' | 'accent';
export type BadgeSurface = 'primary' | 'secondary';

export interface BadgeProps {
  tone?: BadgeTone;
  surface?: BadgeSurface;
  children: ReactNode;
}

const tones: Record<BadgeTone, string> = {
  positive: 'bg-[color-mix(in_srgb,var(--positive)_16%,transparent)] text-(--positive)',
  warning: 'bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-(--warning)',
  danger: 'bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-(--danger)',
  neutral: 'text-(--text-muted)',
  accent: 'bg-(--accent) text-white',
};

const neutralSurfaces: Record<BadgeSurface, string> = {
  primary: 'bg-(--surface-primary)',
  secondary: 'bg-(--surface-secondary)',
};

export function Badge({ tone = 'neutral', surface = 'secondary', children }: BadgeProps) {
  const surfaceClass = tone === 'neutral' ? neutralSurfaces[surface] : '';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${surfaceClass} ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
