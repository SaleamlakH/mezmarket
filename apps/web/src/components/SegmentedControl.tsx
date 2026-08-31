import type { ReactNode } from 'react';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-(--border)">
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`focus-ring cursor-pointer border-none px-5 py-2 text-[13px] font-semibold transition-colors ${
              active
                ? 'bg-(--field) text-(--accent)'
                : 'bg-(--surface-secondary) text-(--text-muted) hover:text-(--text)'
            } ${i > 0 ? 'border-l border-(--border)' : ''}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
