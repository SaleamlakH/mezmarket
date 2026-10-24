import type { ReactNode } from 'react';
import { Check, SlidersHorizontal, X } from 'lucide-react';
import type { BadgeTone } from './Badge';

export interface ActiveFilterChip {
  key: string;
  label: string;
  tone?: BadgeTone;
  onRemove: () => void;
}

const TONE_TEXT: Record<BadgeTone, string> = {
  accent: 'text-(--accent)',
  positive: 'text-(--positive)',
  warning: 'text-(--warning)',
  danger: 'text-(--danger)',
  neutral: 'text-(--text)',
};

const TONE_DOT: Record<BadgeTone, string> = {
  accent: 'bg-(--accent)',
  positive: 'bg-(--positive)',
  warning: 'bg-(--warning)',
  danger: 'bg-(--danger)',
  neutral: 'bg-(--text-muted)',
};

export interface FilterBarProps {
  label?: string;
  activeFilters: ActiveFilterChip[];
  onOpen: () => void;
}

/**
 * The compact filter control used above lists. One button opens the filter
 * sheet and each applied filter is shown as a chip that can be removed.
 */
export function FilterBar({ label = 'Filters', activeFilters, onOpen }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="focus-ring inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-(--border) bg-(--surface-primary) px-3 text-xs font-semibold text-(--text) transition-colors hover:border-(--accent) hover:text-(--accent)"
      >
        <SlidersHorizontal size={15} aria-hidden />
        <span>{label}</span>
        {activeFilters.length > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-(--accent) px-1.5 text-[11px] font-bold text-white">
            {activeFilters.length}
          </span>
        )}
      </button>

      {activeFilters.map((filter) => (
        <span
          key={filter.key}
          className="inline-flex items-center gap-1.5 rounded-lg border border-(--border) bg-(--surface-primary) py-1 pr-1 pl-2.5 text-xs font-semibold"
        >
          <span className={TONE_TEXT[filter.tone ?? 'neutral']}>{filter.label}</span>
          <button
            type="button"
            onClick={filter.onRemove}
            aria-label={`Remove ${filter.label} filter`}
            className="focus-ring inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-(--text-muted) transition-colors hover:bg-(--surface-secondary) hover:text-(--text)"
          >
            <X size={13} aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}

export interface FilterOptionProps {
  active: boolean;
  tone?: BadgeTone;
  onClick: () => void;
  children: ReactNode;
}

export function FilterOption({ active, tone = 'accent', onClick, children }: FilterOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`focus-ring flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
        active
          ? 'border-(--accent) bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]'
          : 'border-(--border) bg-(--field) hover:border-(--text-muted)'
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]}`} />
        <span className="text-sm font-semibold text-(--text)">{children}</span>
      </span>
      {active && <Check size={16} className="shrink-0 text-(--accent)" aria-hidden />}
    </button>
  );
}
