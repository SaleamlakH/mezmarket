import type { ReactNode } from 'react';

export interface RailCardProps {
  icon?: ReactNode;
  title: string;
  meta?: string;
  badge?: ReactNode;
  thumb?: ReactNode;
}

export function RailCard({ icon, title, meta, badge, thumb }: RailCardProps) {
  return (
    <div className="w-[130px] shrink-0 rounded-xl border border-(--border) bg-(--field) p-3">
      {thumb ? (
        <div className="mb-2 h-[60px] w-full overflow-hidden rounded-lg border border-(--border) bg-(--surface-secondary)">
          {thumb}
        </div>
      ) : (
        icon && (
          <div className="mb-2.5 flex h-[26px] w-[26px] items-center justify-center rounded-md border border-(--border) bg-(--surface-secondary) text-(--text-muted)">
            {icon}
          </div>
        )
      )}
      <p className="m-0 text-xs font-bold text-(--text)">{title}</p>
      {meta && <p className="m-0 mt-0.5 mb-2 text-[10px] text-(--text-muted)">{meta}</p>}
      {badge && <div className="mt-1">{badge}</div>}
    </div>
  );
}
