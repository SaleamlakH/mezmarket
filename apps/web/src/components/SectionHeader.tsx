import type { ReactNode } from 'react';

export interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  onSeeMore?: () => void;
  seeMoreLabel?: string;
}

export function SectionHeader({ icon, title, onSeeMore, seeMoreLabel }: SectionHeaderProps) {
  return (
    <div className="mb-2.5 mt-4 flex items-baseline justify-between first:mt-0">
      <div className="flex items-center gap-1.5">
        {icon && (
          <span className="flex h-[18px] w-[18px] items-center justify-center text-(--text-muted)">
            {icon}
          </span>
        )}
        <h4 className="m-0 text-sm font-bold text-(--text)">{title}</h4>
      </div>
      {onSeeMore && (
        <button
          type="button"
          onClick={onSeeMore}
          className="focus-ring cursor-pointer border-none bg-transparent text-[11px] font-semibold text-(--accent) hover:underline"
        >
          {seeMoreLabel ?? 'See more'}
        </button>
      )}
    </div>
  );
}
