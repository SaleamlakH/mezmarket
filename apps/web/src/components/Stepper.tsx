import { Minus, Plus } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

export type StepperSize = 'sm' | 'md' | 'lg';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  /** The control's size. */
  size?: StepperSize;
  /** `field` renders an editable input; `text` renders a plain value. */
  variant?: 'field' | 'text';
  className?: string;
}

const sizes: Record<StepperSize, { icon: number; gap: string; text: string }> = {
  sm: { icon: 14, gap: 'gap-1', text: 'text-xs' },
  md: { icon: 16, gap: 'gap-1.5', text: 'text-xs' },
  lg: { icon: 18, gap: 'gap-2', text: 'text-sm' },
};

/** A quantity control: a number field flanked by minus and plus buttons. */
export function Stepper({
  value,
  onChange,
  min = 0,
  size = 'lg',
  variant = 'field',
  className = 'w-full',
}: StepperProps) {
  const clamp = (next: number) => (Number.isNaN(next) ? min : Math.max(min, next));
  const dec = () => onChange(clamp(value - 1));
  const inc = () => onChange(clamp(value + 1));
  const config = sizes[size];

  return (
    <div className={`flex items-stretch ${config.gap} ${className}`}>
      <Button
        type="button"
        shape="square"
        size={size}
        variant="field"
        aria-label="Decrease"
        onClick={dec}
      >
        <Minus size={config.icon} />
      </Button>
      {variant === 'text' ? (
        <span
          className={`flex min-w-0 flex-1 items-center justify-center font-mono font-bold tabular-nums text-(--text) ${config.text}`}
        >
          {value}
        </span>
      ) : (
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          min={min}
          value={value}
          aria-label="Quantity"
          onChange={(event) => onChange(clamp(Number(event.currentTarget.value)))}
          size={size}
          className="min-w-0 flex-1 text-center font-mono font-bold"
        />
      )}
      <Button
        type="button"
        shape="square"
        size={size}
        variant="field"
        aria-label="Increase"
        onClick={inc}
      >
        <Plus size={config.icon} />
      </Button>
    </div>
  );
}
