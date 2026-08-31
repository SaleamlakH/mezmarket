import type { ReactNode } from 'react';

export interface StatusOption<T extends string = string> {
  value: T;
  label: ReactNode;
}

export interface StatusToggleProps<T extends string = string> {
  options: StatusOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function StatusToggle<T extends string = string>({
  options,
  value,
  onChange,
}: StatusToggleProps<T>) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`focus-ring flex-1 cursor-pointer rounded-lg border px-5 py-3 text-[13px] font-bold transition-colors ${
              on
                ? 'border-(--positive) bg-(--positive) text-white'
                : 'border-(--border) bg-(--field) text-(--text-muted) hover:text-(--text)'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
