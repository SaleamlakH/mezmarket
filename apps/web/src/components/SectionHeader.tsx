import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  onSeeMore?: () => void;
  seeMoreLabel?: string;
}

export function SectionHeader({ icon, title, onSeeMore, seeMoreLabel }: SectionHeaderProps) {
  return (
    <div className="mb-2.5 mt-4 flex items-center justify-between gap-2 first:mt-0">
      <div className="flex min-w-0 items-center gap-1.5">
        {icon && (
          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center text-(--text-muted)">
            {icon}
          </span>
        )}
        <h4 className="m-0 truncate text-sm font-bold text-(--text)">{title}</h4>
      </div>

      {seeMoreLabel && (
        <button
          type="button"
          onClick={onSeeMore}
          className="focus-ring -mr-2 inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded-md px-2 py-1.5 text-sm font-bold text-(--accent) transition-colors hover:bg-(--surface-secondary) hover:text-(--accent-hover)"
        >
          {seeMoreLabel ?? 'See more'}
          <ChevronRight size={15} aria-hidden />
        </button>
      )}
    </div>
  );
}
