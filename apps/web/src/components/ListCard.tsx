import type { ReactNode } from 'react';

export interface ListCardProps {
  thumb?: ReactNode;
  title: string;
  meta?: string;
  price?: string;
  sub?: string;
  tag?: ReactNode;
}

export function ListCard({ thumb, title, meta, price, sub, tag }: ListCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-(--border) bg-(--field) p-3">
      <div className="h-[42px] w-[42px] shrink-0 overflow-hidden rounded-lg border border-(--border) bg-(--surface-secondary)">
        {thumb}
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[13px] font-semibold text-(--text)">{title}</p>
        {meta && <p className="m-0 mt-0.5 text-[11px] text-(--text-muted)">{meta}</p>}
      </div>
      <div className="shrink-0 text-right">
        {price && <p className="m-0 font-mono text-[13px] font-semibold text-(--text)">{price}</p>}
        {sub && <p className="m-0 mt-0.5 text-[11px] text-(--text-muted)">{sub}</p>}
        {tag && !sub && <div className="mt-1">{tag}</div>}
      </div>
    </div>
  );
}
