import type { ReactNode } from 'react';

export type BadgeTone = 'positive' | 'warning' | 'danger' | 'neutral' | 'accent';
export type BadgeSurface = 'primary' | 'secondary';

export interface BadgeProps {
  tone?: BadgeTone;
  surface?: BadgeSurface;
  children: ReactNode;
}

const tones: Record<BadgeTone, string> = {
  positive: 'bg-(--badge-positive-bg) text-(--badge-positive-text)',
  warning: 'bg-(--badge-warning-bg) text-(--badge-warning-text)',
  danger: 'bg-(--badge-danger-bg) text-(--badge-danger-text)',
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
