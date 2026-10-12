import { Minus, Plus } from 'lucide-react';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  /** `md` — full-width with roomy controls (default); `sm` — compact. */
  size?: 'sm' | 'md';
  /** `field` — an editable number input (default); `text` — plain quantity. */
  variant?: 'field' | 'text';
  className?: string;
}

const SIZES = {
  sm: {
    button: 'h-7 w-7 rounded-lg',
    icon: 14,
    input: 'h-7 rounded-lg text-xs',
    text: 'text-xs',
    gap: 'gap-1.5',
  },
  md: {
    button: 'h-10 w-12 rounded-xl',
    icon: 16,
    input: 'h-10 rounded-xl text-sm',
    text: 'text-sm',
    gap: 'gap-2',
  },
};

/**
 * A quantity control: a number field flanked by minus and plus buttons, so a
 * value can be typed directly or nudged a step at a time
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  size = 'md',
  variant = 'field',
  className = 'w-full',
}: StepperProps) {
  const clamp = (next: number) => (Number.isNaN(next) ? min : Math.max(min, next));
  const dec = () => onChange(clamp(value - 1));
  const inc = () => onChange(clamp(value + 1));
  const config = SIZES[size];

  return (
    <div className={`flex items-stretch ${config.gap} ${className}`}>
      <button
        type="button"
        aria-label="Decrease"
        onClick={dec}
        className={`focus-ring flex shrink-0 cursor-pointer items-center justify-center border border-(--border) bg-(--field) text-(--text) transition-colors hover:bg-(--accent) hover:text-white ${config.button}`}
      >
        <Minus size={config.icon} />
      </button>
      {variant === 'text' ? (
        <span
          className={`flex min-w-0 flex-1 items-center justify-center font-mono font-bold tabular-nums text-(--text) ${config.text}`}
        >
          {value}
        </span>
      ) : (
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={min}
          value={value}
          onChange={(event) => onChange(clamp(Number(event.currentTarget.value)))}
          className={`min-w-0 flex-1 border border-(--border) bg-(--field) px-2 text-center font-mono font-bold text-(--text) outline-none transition-colors duration-150 focus:border-(--accent) ${config.input}`}
        />
      )}
      <button
        type="button"
        aria-label="Increase"
        onClick={inc}
        className={`focus-ring flex shrink-0 cursor-pointer items-center justify-center border border-(--border) bg-(--field) text-(--text) transition-colors hover:bg-(--accent) hover:text-white ${config.button}`}
      >
        <Plus size={config.icon} />
      </button>
    </div>
  );
}
